import { daily_summaries } from '@/lib/db/schema';
import { eq, and, between } from 'drizzle-orm';
import { BaseRepository } from '../db/';

// Daily Summary 数据类型定义
export type DailySummaryData = typeof daily_summaries.$inferSelect;

// 创建输入类型
export type DailySummaryCreateInput = Omit<DailySummaryData, 'id' | 'created_at' | 'updated_at'>;

// 更新输入类型
export type DailySummaryUpdateInput = Partial<DailySummaryData> & { id: number };

/**
 * DailySummary持久化服务
 */
export class DailySummaryPersistenceService extends BaseRepository<typeof daily_summaries, DailySummaryData> {
  constructor(connectionString?: string) {
    super(daily_summaries);

    // 设置钩子
    this.setHooks({
      beforeCreate: async (data) => {
        // 确保日期格式正确 (YYYY-MM-DD)
        if (data.date && !this.isValidDateFormat(data.date)) {
          throw new Error('日期格式必须为 YYYY-MM-DD');
        }
        return data;
      },
      beforeUpdate: async (id, data) => {
        // 确保日期格式正确 (YYYY-MM-DD)
        if (data.date && !this.isValidDateFormat(data.date)) {
          throw new Error('日期格式必须为 YYYY-MM-DD');
        }
        return data;
      }
    });
  }

  /**
   * 验证日期格式是否为 YYYY-MM-DD
   */
  private isValidDateFormat(dateString: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(dateString);
  }

  /**
   * 重写create方法，添加时间戳
   */
  async create(data: DailySummaryCreateInput): Promise<DailySummaryData> {
    const now = new Date().toISOString();
    return super.create({
      ...data,
      created_at: now,
      updated_at: now
    } as any);
  }

  /**
   * 重写update方法，自动更新时间戳
   */
  async update(id: string | number, data: Partial<DailySummaryData>): Promise<DailySummaryData> {
    const updateData = { 
      ...data,
      updated_at: new Date().toISOString()
    };
    
    return super.update(id, updateData);
  }

  /**
   * 根据用户ID和日期查找总结
   */
  async findByUserAndDate(userId: string, date: string): Promise<DailySummaryData | null> {
    const result = await this.findOne({
      user_id: userId,
      date: date
    });
    
    return result;
  }

  /**
   * 获取用户在指定日期范围内的所有总结
   */
  async findByDateRange(userId: string, startDate: string, endDate: string): Promise<DailySummaryData[]> {
    return this.db
      .select()
      .from(daily_summaries)
      .where(
        and(
          eq(daily_summaries.user_id, userId),
          between(daily_summaries.date, startDate, endDate)
        )
      );
  }

  /**
   * 获取用户最近的N条总结
   */
  async findRecentSummaries(userId: string, limit: number = 7): Promise<DailySummaryData[]> {
    return this.db
      .select()
      .from(daily_summaries)
      .where(eq(daily_summaries.user_id, userId))
      .orderBy(daily_summaries.date, 'desc')
      .limit(limit);
  }

  /**
   * 获取或创建指定日期的总结
   * 如果不存在则创建新的总结记录
   */
  async getOrCreate(userId: string, date: string, defaultContent: any = {}): Promise<DailySummaryData> {
    const existing = await this.findByUserAndDate(userId, date);
    
    if (existing) {
      return existing;
    }
    
    // 创建新的总结记录
    return this.create({
      user_id: userId,
      date: date,
      content: defaultContent,
      summary_type: 'daily'
    });
  }

  /**
   * 获取不同类型的总结
   */
  async findByType(userId: string, summaryType: 'daily' | 'three_day' | 'weekly', limit: number = 10): Promise<DailySummaryData[]> {
    return this.db
      .select()
      .from(daily_summaries)
      .where(
        and(
          eq(daily_summaries.user_id, userId),
          eq(daily_summaries.summary_type, summaryType)
        )
      )
      .orderBy(daily_summaries.date, 'desc')
      .limit(limit);
  }
}
