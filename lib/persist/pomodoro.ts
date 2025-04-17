import { tags, pomodoro_tag_relations, pomodoros } from '@/lib/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { BaseRepository } from '../db/';

// Pomodoro数据类型定义
export type PomodoroData = typeof pomodoros.$inferSelect & {
  tags?: Array<{
    id: number;
    name: string;
    color: string;
  }>;
  tagIds?: number[];
};

// 创建输入类型
export type PomodoroCreateInput = Omit<PomodoroData, 'id' | 'created_at'>;

// 更新输入类型
export type PomodoroUpdateInput = Partial<PomodoroData> & { id: number };

// PomodoroWithTags接口
export interface PomodoroWithTags {
  pomodoro: PomodoroData;
  tags: Array<{
    id: number;
    name: string;
    color: string;
  }>;
}

/**
 * Pomodoro持久化服务
 */
export class PomodoroPersistenceService extends BaseRepository<typeof pomodoros, PomodoroData> {
  constructor(connectionString?: string) {
    super(pomodoros);

    // 设置钩子，在查询后自动加载关联的标签
    this.setHooks({
      // 添加afterCreate钩子，处理tagIds
      afterCreate: async (createData, pomodoro) => {
        if (createData.tagIds && Array.isArray(createData.tagIds) && createData.tagIds.length > 0) {
          await this.associateTagsWithPomodoro(pomodoro.id, createData.tagIds);
        }
        return pomodoro;
      },
      afterQuery: async (data) => {
        if (!data) return data;

        // 处理单个 Pomodoro 对象
        if (!Array.isArray(data)) {
          return this.loadTagsForSinglePomodoro(data);
        }

        // 处理 Pomodoro 数组
        return this.loadTagsForMultiplePomodoros(data);
      }
    });
  }
  /**
 * 关联标签到Pomodoro
 */
  private async associateTagsWithPomodoro(pomodoroId: number, tagIds: number[]): Promise<void> {
    // 创建要插入的数据数组
    const relations = tagIds.map(tagId => ({
      pomodoro_id: pomodoroId,
      tag_id: tagId
    }));

    // 批量插入关联记录
    await this.db.insert(pomodoro_tag_relations).values(relations);
  }
  /**
   * 重写create方法，添加时间戳
   */
  async create(data: Partial<PomodoroData>): Promise<PomodoroData> {
    const now = new Date().toISOString();
    return super.create({
      ...data,
      created_at: data.created_at || now,
    } as any);
  }

  /**
   * 重写update方法，如果状态更改为completed，则设置end_time
   */
  async update(id: string | number, data: Partial<PomodoroData>): Promise<PomodoroData> {
    const updateData = { ...data };

    // 如果状态更改为completed且没有提供end_time，则自动设置end_time
    if (data.status === 'completed' && !data.end_time) {
      updateData.end_time = new Date().toISOString();
    }

    return super.update(id, updateData);
  }

  /**
   * 获取 Pomodoro 及其标签
   */
  async getPomodoroWithTags(pomodoroId: number): Promise<PomodoroWithTags | null> {
    // 获取Pomodoro项
    const pomodoroItem = await this.findById(pomodoroId);

    if (!pomodoroItem) return null;

    // 获取关联的标签
    const tagList = await this.getTagsForPomodoro(pomodoroId);

    return {
      pomodoro: pomodoroItem,
      tags: tagList
    };
  }

  /**
   * 为单个 Pomodoro 加载标签
   */
  private async loadTagsForSinglePomodoro(pomodoro: PomodoroData): Promise<PomodoroData> {
    pomodoro.tags = await this.getTagsForPomodoro(pomodoro.id);
    return pomodoro;
  }

  /**
   * 为多个 Pomodoro 批量加载标签
   */
  private async loadTagsForMultiplePomodoros(pomodoros: PomodoroData[]): Promise<PomodoroData[]> {
    if (pomodoros.length === 0) return pomodoros;

    // 提取所有 pomodoro IDs
    const pomodoroIds = pomodoros.map(pomodoro => pomodoro.id);

    // 批量获取所有关联的标签关系和标签数据
    const allPomodoroTags = await this.db
      .select({
        pomodoro_id: pomodoro_tag_relations.pomodoro_id,
        tag_id: tags.id,
        name: tags.name,
        color: tags.color
      })
      .from(pomodoro_tag_relations)
      .where(inArray(pomodoro_tag_relations.pomodoro_id, pomodoroIds))
      .innerJoin(
        tags,
        eq(pomodoro_tag_relations.tag_id, tags.id)
      );

    // 为每个 pomodoro 分配其对应的标签
    return pomodoros.map(pomodoro => ({
      ...pomodoro,
      tags: allPomodoroTags
        .filter(relation => relation.pomodoro_id === pomodoro.id)
        .map(tag => ({
          id: tag.tag_id,
          name: tag.name,
          color: tag.color
        }))
    }));
  }

  /**
   * 获取单个 Pomodoro 的标签
   */
  private async getTagsForPomodoro(pomodoroId: number): Promise<Array<{ id: number; name: string; color: string; }>> {
    return this.db
      .select({
        id: tags.id,
        name: tags.name,
        color: tags.color
      })
      .from(pomodoro_tag_relations)
      .where(eq(pomodoro_tag_relations.pomodoro_id, pomodoroId))
      .innerJoin(
        tags,
        eq(pomodoro_tag_relations.tag_id, tags.id)
      );
  }

  /**
   * 查询用户的未完成番茄钟
   */
  async findRunningPomodoros(userId: string): Promise<PomodoroData[]> {
    return this.findMany({
      user_id: userId,
      status: 'running'
    }
    );
  }
}
