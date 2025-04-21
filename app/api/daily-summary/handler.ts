import { DailySummaryData, DailySummaryPersistenceService } from '@/lib/persist/dailySummary';
import { BaseApiHandler } from "../lib/BaseApiHandler";
import { BusinessObject } from '../lib/types';

export interface DailySummaryBO extends BusinessObject {
  userId: string;
  date: string;
  content: any;
  aiSummary?: string;
  aiFeedbackActions?: any;
  summaryType: 'daily' | 'three_day' | 'weekly';
  createdAt: string;
  updatedAt: string;
}

export class DailySummaryApiHandler extends BaseApiHandler<DailySummaryData, DailySummaryBO> {
  validateBO(data: DailySummaryBO): boolean {
    if (!data) return false;

    // userId 是必需的
    if (!data.userId) return false;

    // date 是必需的且格式必须为 YYYY-MM-DD
    if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      return false;
    }

    // content 是必需的且必须是对象
    if (!data.content || typeof data.content !== 'object') {
      return false;
    }

    // summaryType 必须是有效的枚举值
    if (!data.summaryType || !['daily', 'three_day', 'weekly'].includes(data.summaryType)) {
      return false;
    }

    return true;
  }

  setDefaultsBO(businessObject: Partial<DailySummaryBO>, isUpdate: boolean): Partial<DailySummaryBO> {
    const now = new Date();
    const isoNow = now.toISOString();

    // 设置默认值
    if (!isUpdate) {
      businessObject.createdAt = isoNow;
      businessObject.updatedAt = isoNow;
      
      // 设置默认的总结类型
      if (!businessObject.summaryType) {
        businessObject.summaryType = 'daily';
      }
      
      // 如果没有指定日期，使用当天的日期
      if (!businessObject.date) {
        businessObject.date = now.toISOString().split('T')[0]; // YYYY-MM-DD 格式
      }
      
      // 初始化空的内容对象
      if (!businessObject.content) {
        businessObject.content = {};
      }
    } else {
      // 更新时只更新更新时间
      businessObject.updatedAt = isoNow;
    }

    return businessObject;
  }

  protected generateId(): string {
    // 依赖数据库生成 ID
    return '';
  }

  getResourceName(): string {
    return 'daily-summary';
  }

  toBusinessObject(dataObject: DailySummaryData): DailySummaryBO {
    return {
      id: dataObject.id,
      userId: dataObject.user_id,
      date: dataObject.date,
      content: dataObject.content,
      aiSummary: dataObject.ai_summary || undefined,
      aiFeedbackActions: dataObject.ai_feedback_actions || undefined,
      summaryType: dataObject.summary_type,
      createdAt: dataObject.created_at,
      updatedAt: dataObject.updated_at,
    };
  }

  toDataObject(businessObject: DailySummaryBO): Partial<DailySummaryData> {
    const result: Partial<DailySummaryData> = {
      user_id: businessObject.userId,
      date: businessObject.date,
      content: businessObject.content,
      ai_summary: businessObject.aiSummary,
      ai_feedback_actions: businessObject.aiFeedbackActions,
      summary_type: businessObject.summaryType,
      updated_at: businessObject.updatedAt,
    };
    
    if (businessObject.id && businessObject.id > 0) {
      result.id = businessObject.id;
    }
    
    return result;
  }

  toBusinessObjects(dataObjects: DailySummaryData[]): DailySummaryBO[] {
    return dataObjects.map(data => this.toBusinessObject(data));
  }

  toDataObjects(businessObjects: DailySummaryBO[]): Partial<DailySummaryData>[] {
    return businessObjects.map(bo => this.toDataObject(bo));
  }

  /**
   * 获取用户最近的总结记录
   */
  async getRecentSummaries(userId: string, limit: number = 7): Promise<DailySummaryBO[]> {
    try {
      const persistenceService = this.persistenceService as DailySummaryPersistenceService;
      const summaries = await persistenceService.findRecentSummaries(userId, limit);
      return this.toBusinessObjects(summaries);
    } catch (error) {
      console.error('获取最近总结失败:', error);
      return [];
    }
  }

  /**
   * 获取特定类型的总结
   */
  async getSummariesByType(userId: string, summaryType: 'daily' | 'three_day' | 'weekly', limit: number = 10): Promise<DailySummaryBO[]> {
    try {
      const persistenceService = this.persistenceService as DailySummaryPersistenceService;
      const summaries = await persistenceService.findByType(userId, summaryType, limit);
      return this.toBusinessObjects(summaries);
    } catch (error) {
      console.error(`获取${summaryType}类型总结失败:`, error);
      return [];
    }
  }

  /**
   * 根据日期范围获取总结
   */
  async getSummariesByDateRange(userId: string, startDate: string, endDate: string): Promise<DailySummaryBO[]> {
    try {
      const persistenceService = this.persistenceService as DailySummaryPersistenceService;
      const summaries = await persistenceService.findByDateRange(userId, startDate, endDate);
      return this.toBusinessObjects(summaries);
    } catch (error) {
      console.error('获取日期范围总结失败:', error);
      return [];
    }
  }

  static override create<DailySummaryData, DailySummaryBO extends BusinessObject>(): BaseApiHandler<DailySummaryData, DailySummaryBO> {
    const persistenceService = new DailySummaryPersistenceService();
    return new DailySummaryApiHandler(
      persistenceService
    ) as unknown as BaseApiHandler<DailySummaryData, DailySummaryBO>;
  }
}
