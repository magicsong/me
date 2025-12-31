import { NoteData, NotePersistenceService } from '@/lib/persist/note';
import { BaseApiHandler } from "../lib/BaseApiHandler";
import { BusinessObject } from '../lib/types';
import { NoteBO } from '../types';

const PREVIEW_CONTENT_LENGTH = 100; // 列表展示时的内容预览长度

export class NoteApiHandler extends BaseApiHandler<NoteData, NoteBO> {
  validateBO(data: NoteBO): boolean {
    if (!data) return false;

    // title 是必需的
    if (!data.title) return false;

    // content 是必需的
    if (!data.content === undefined || data.content === null) return false;

    // 必须有用户ID
    if (!data.userId) return false;

    return true;
  }

  /**
   * 截断笔记内容为预览文本（用于列表展示）
   */
  truncateContent(note: NoteBO, maxLength: number = PREVIEW_CONTENT_LENGTH): NoteBO {
    if (!note.content || note.content.length <= maxLength) {
      return note;
    }
    
    return {
      ...note,
      content: note.content.substring(0, maxLength)
    };
  }

  /**
   * 批量截断内容
   */
  truncateContents(notes: NoteBO[], maxLength: number = PREVIEW_CONTENT_LENGTH): NoteBO[] {
    return notes.map(note => this.truncateContent(note, maxLength));
  }

  setDefaultsBO(businessObject: Partial<NoteBO>, isUpdate: boolean): Partial<NoteBO> {
    const now = new Date();

    // 设置默认值
    if (!isUpdate) {
      businessObject.createdAt = businessObject.createdAt || now.toISOString();
      businessObject.updatedAt = now.toISOString();
    } else {
      // 更新时总是更新updatedAt
      businessObject.updatedAt = now.toISOString();
    }

    return businessObject;
  }

  protected generateId(): string {
    // 在这个实现中，依赖于数据库来生成 ID
    return '';
  }

  getResourceName(): string {
    return 'note';
  }

  toBusinessObject(dataObject: NoteData): NoteBO {
    return {
      id: dataObject.id,
      userId: dataObject.user_id,
      title: dataObject.title,
      content: dataObject.content,
      category: dataObject.category ?? undefined,
      createdAt: dataObject.created_at,
      updatedAt: dataObject.updated_at,
      tags: dataObject.tags,
    };
  }

  toDataObject(businessObject: NoteBO): Partial<NoteData> {
    const result: Partial<NoteData> = {
      user_id: businessObject.userId,
      title: businessObject.title,
      content: businessObject.content,
      category: businessObject.category,
    };
    
    if (businessObject.id && businessObject.id > 0) {
      result.id = businessObject.id;
    }
    
    // 只在创建时设置created_at，数据库服务会自动更新updated_at
    if (businessObject.createdAt) {
      result.created_at = businessObject.createdAt;
    }
    
    if (businessObject.updatedAt) {
      result.updated_at = businessObject.updatedAt;
    }
    
    return result;
  }

  toBusinessObjects(dataObjects: NoteData[]): NoteBO[] {
    return dataObjects.map(data => this.toBusinessObject(data));
  }

  toDataObjects(businessObjects: NoteBO[]): Partial<NoteData>[] {
    return businessObjects.map(bo => this.toDataObject(bo));
  }

  /**
   * 搜索笔记
   */
  async searchNotes(userId: string, query: string): Promise<NoteBO[]> {
    try {
      const notes = await (this.persistenceService as NotePersistenceService).searchNotes(userId, query);
      return this.toBusinessObjects(notes);
    } catch (error) {
      console.error('搜索笔记失败:', error);
      return [];
    }
  }

  /**
   * 按类别查找笔记
   */
  async findNotesByCategory(userId: string, category: string): Promise<NoteBO[]> {
    try {
      const notes = await (this.persistenceService as NotePersistenceService).findNotesByCategory(userId, category);
      return this.toBusinessObjects(notes);
    } catch (error) {
      console.error('按类别查找笔记失败:', error);
      return [];
    }
  }

  /**
   * 更新笔记标签
   */
  async updateNoteTags(noteId: number, tagIds: number[]): Promise<boolean> {
    try {
      await (this.persistenceService as NotePersistenceService).updateNoteTags(noteId, tagIds);
      return true;
    } catch (error) {
      console.error('更新笔记标签失败:', error);
      return false;
    }
  }

  static override create<NoteData, NoteBO extends BusinessObject>(): BaseApiHandler<NoteData, NoteBO> {
    const persistenceService = new NotePersistenceService();
    return new NoteApiHandler(
      persistenceService
    ) as unknown as BaseApiHandler<NoteData, NoteBO>;
  }
}