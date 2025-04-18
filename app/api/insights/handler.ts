import { BaseApiHandler } from "@/app/api/lib/BaseApiHandler";
import { PersistenceService } from "@/app/api/lib/types";
import { AIInsightDO, AIInsightBO } from "./types";
import { AIInsightPromptBuilder } from "./promptBuilder";
import { AIInsightOutputParser } from "./outputParser";
import { AIInsightPersistenceService } from "./persistence";

export class AIInsightHandler extends BaseApiHandler<AIInsightDO, AIInsightBO> {
  constructor(
    persistenceService?: PersistenceService<AIInsightDO>,
    promptBuilder?: AIInsightPromptBuilder,
    outputParser?: AIInsightOutputParser
  ) {
    super(
      persistenceService || new AIInsightPersistenceService(),
      promptBuilder || new AIInsightPromptBuilder(),
      outputParser || new AIInsightOutputParser()
    );
  }
  protected validateInput(data: any): boolean {
    // 基本验证
    if (!data) return false;
    
    // 必填字段验证
    if (data.create) {
      return !!data.user_id && !!data.kind && 
             !!data.time_period_start && !!data.time_period_end;
    }
    
    // 对于更新，至少需要一个要更新的字段
    return Object.keys(data).some(key => 
      ['title', 'content', 'content_json', 'kind', 'time_period_start', 
       'time_period_end', 'metadata', 'reference_ids', 'tags'].includes(key)
    );
  }

  protected generateId(): string {
    return Date.now().toString();
  }

  protected resourceName(): string {
    return "AIInsight";
  }

  // 将数据对象转换为业务对象
  toBusinessObject(dataObject: AIInsightDO): AIInsightBO {
    return {
      id: dataObject.id,
      userId: dataObject.user_id,
      kind: dataObject.kind,
      title: dataObject.title,
      content: dataObject.content,
      contentJson: dataObject.content_json,
      timePeriodStart: dataObject.time_period_start,
      timePeriodEnd: dataObject.time_period_end,
      metadata: dataObject.metadata,
      createdAt: dataObject.created_at,
      updatedAt: dataObject.updated_at,
      referenceIds: dataObject.reference_ids,
      tags: dataObject.tags
    };
  }

  // 将业务对象转换为数据对象
  toDataObject(businessObject: AIInsightBO): Partial<AIInsightDO> {
    return {
      user_id: businessObject.userId,
      kind: businessObject.kind,
      title: businessObject.title,
      content: businessObject.content,
      content_json: businessObject.contentJson,
      time_period_start: businessObject.timePeriodStart,
      time_period_end: businessObject.timePeriodEnd,
      metadata: businessObject.metadata,
      reference_ids: businessObject.referenceIds,
      tags: businessObject.tags
    };
  }

  // 将多个数据对象转换为业务对象
  toBusinessObjects(dataObjects: AIInsightDO[]): AIInsightBO[] {
    return dataObjects.map(dataObject => this.toBusinessObject(dataObject));
  }

  // 将多个业务对象转换为数据对象
  toDataObjects(businessObjects: AIInsightBO[]): Partial<AIInsightDO>[] {
    return businessObjects.map(businessObject => this.toDataObject(businessObject));
  }

  /**
   * 使用过滤条件获取所有符合条件的洞察
   */
  async getAllWithFilters(userId: string, filters: Record<string, any> = {}): Promise<AIInsightBO[]> {
    try {
      // 调用持久化服务的getWithFilters方法，不使用分页
      if (!this.persistenceService.getWithFilters) {
        return [];
      }
      const result = await this.persistenceService.getWithFilters(filters, userId);
      return this.toBusinessObjects(result.items);
    } catch (error) {
      console.error(`获取所有${this.resourceName()}失败:`, error);
      return [];
    }
  }

  /**
   * 使用过滤条件分页获取洞察
   */
  async getPageWithFilters(
    page: number = 1, 
    pageSize: number = 10, 
    userId: string, 
    filters: Record<string, any> = {}
  ): Promise<{
    items: AIInsightBO[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    try {
      if (!this.persistenceService.getPageWithFilters) {
        return {
          items: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0
        };
      }
      // 确保页码有效
      page = Math.max(1, page);
      pageSize = Math.max(1, Math.min(100, pageSize));

      // 调用持久化服务的getWithFilters方法，使用分页
      const result = await this.persistenceService.getPageWithFilters(page, pageSize, filters, userId);
      
      // 计算总页数
      const totalPages = Math.ceil(result.total / pageSize);
      
      // 转换为业务对象
      const boItems = this.toBusinessObjects(result.items);

      return {
        items: boItems,
        total: result.total,
        page,
        pageSize,
        totalPages
      };
    } catch (error) {
      console.error(`分页获取${this.resourceName()}失败:`, error);
      return {
        items: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0
      };
    }
  }
}
