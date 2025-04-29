import { tags, notesTags, notes } from '@/lib/db/schema';
import { and, eq, inArray, like } from 'drizzle-orm';
import { BaseRepository } from '../db/';

// Note数据类型定义
export type NoteData = typeof notes.$inferSelect & {
  tags?: Array<{
    id: number;
    name: string;
    color: string;
  }>;
  tagIds?: number[];
};

// 创建输入类型
export type NoteCreateInput = Omit<NoteData, 'id' | 'created_at' | 'updated_at'>;

// 更新输入类型
export type NoteUpdateInput = Partial<NoteData> & { id: number };

// NoteWithTags接口
export interface NoteWithTags {
  note: NoteData;
  tags: Array<{
    id: number;
    name: string;
    color: string;
  }>;
}

/**
 * Note持久化服务
 */
export class NotePersistenceService extends BaseRepository<typeof notes, NoteData> {
  constructor(connectionString?: string) {
    super(notes);

    // 设置钩子，在查询后自动加载关联的标签
    this.setHooks({
      // 添加afterCreate钩子，处理tagIds
      afterCreate: async (createData, note) => {
        if (createData.tagIds && Array.isArray(createData.tagIds) && createData.tagIds.length > 0) {
          await this.associateTagsWithNote(note.id, createData.tagIds);
        }
        return note;
      },
      afterQuery: async (data) => {
        if (!data) return data;

        // 处理单个 Note 对象
        if (!Array.isArray(data)) {
          return this.loadTagsForSingleNote(data);
        }

        // 处理 Note 数组
        return this.loadTagsForMultipleNotes(data);
      }
    });
  }

  /**
   * 关联标签到Note
   */
  private async associateTagsWithNote(noteId: number, tagIds: number[]): Promise<void> {
    // 创建要插入的数据数组
    const relations = tagIds.map(tagId => ({
      note_id: noteId,
      tag_id: tagId
    }));

    // 批量插入关联记录
    await this.db.insert(notesTags).values(relations);
  }

  /**
   * 重写create方法，添加时间戳
   */
  async create(data: Partial<NoteData>): Promise<NoteData> {
    const now = new Date().toISOString();
    return super.create({
      ...data,
      created_at: data.created_at || now,
      updated_at: data.updated_at || now,
    } as any);
  }

  /**
   * 重写update方法，自动更新updated_at
   */
  async update(id: string | number, data: Partial<NoteData>): Promise<NoteData> {
    const now = new Date().toISOString();
    return super.update(id, {
      ...data,
      updated_at: now,
    });
  }

  /**
   * 获取 Note 及其标签
   */
  async getNoteWithTags(noteId: number): Promise<NoteWithTags | null> {
    // 获取Note项
    const noteItem = await this.findById(noteId);

    if (!noteItem) return null;

    // 获取关联的标签
    const tagList = await this.getTagsForNote(noteId);

    return {
      note: noteItem,
      tags: tagList
    };
  }

  /**
   * 为单个 Note 加载标签
   */
  private async loadTagsForSingleNote(note: NoteData): Promise<NoteData> {
    note.tags = await this.getTagsForNote(note.id);
    return note;
  }

  /**
   * 为多个 Note 批量加载标签
   */
  private async loadTagsForMultipleNotes(notes: NoteData[]): Promise<NoteData[]> {
    if (notes.length === 0) return notes;

    // 提取所有 note IDs
    const noteIds = notes.map(note => note.id);

    // 批量获取所有关联的标签关系和标签数据
    const allNoteTags = await this.db
      .select({
        note_id: notesTags.note_id,
        tag_id: tags.id,
        name: tags.name,
        color: tags.color
      })
      .from(notesTags)
      .where(inArray(notesTags.note_id, noteIds))
      .innerJoin(
        tags,
        eq(notesTags.tag_id, tags.id)
      );

    // 为每个 note 分配其对应的标签
    return notes.map(note => ({
      ...note,
      tags: allNoteTags
        .filter(relation => relation.note_id === note.id)
        .map(tag => ({
          id: tag.tag_id,
          name: tag.name,
          color: tag.color
        }))
    }));
  }

  /**
   * 获取单个 Note 的标签
   */
  private async getTagsForNote(noteId: number): Promise<Array<{ id: number; name: string; color: string; }>> {
    return this.db
      .select({
        id: tags.id,
        name: tags.name,
        color: tags.color
      })
      .from(notesTags)
      .where(eq(notesTags.note_id, noteId))
      .innerJoin(
        tags,
        eq(notesTags.tag_id, tags.id)
      );
  }

  /**
   * 按类别查询笔记
   */
  async findNotesByCategory(userId: string, category: string): Promise<NoteData[]> {
    return this.findMany({
      user_id: userId,
      category: category
    });
  }


  /**
   * 移除笔记的标签
   */
  async removeTagFromNote(noteId: number, tagId: number): Promise<void> {
    await this.db
      .delete(notesTags)
      .where(and(eq(notesTags.note_id, noteId),eq(notesTags.tag_id, tagId)));
  }

  /**
   * 更新笔记标签
   */
  async updateNoteTags(noteId: number, tagIds: number[]): Promise<void> {
    // 先删除所有当前关联
    await this.db
      .delete(notesTags)
      .where(eq(notesTags.note_id, noteId));
    
    // 添加新关联
    if (tagIds.length > 0) {
      await this.associateTagsWithNote(noteId, tagIds);
    }
  }
}