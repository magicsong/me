import { db } from "@/lib/db";
import { ai_insights } from "@/lib/db/schema";
import { FilterCondition, FilterOptions, PersistenceService } from "@/app/api/lib/types";
import { and, asc, desc, eq, gt, gte, ilike, inArray, lt, lte, ne, or, SQL, sql, between } from "drizzle-orm";
import { AIInsightDO } from "./types";

export class AIInsightPersistenceService implements PersistenceService<AIInsightDO> {
  async create(data: Partial<AIInsightDO>): Promise<AIInsightDO> {
    const [result] = await db.insert(ai_insights).values(data).returning();
    return result;
  }

  async createMany(data: Partial<AIInsightDO>[]): Promise<AIInsightDO[]> {
    return await db.insert(ai_insights).values(data).returning();
  }

  async get(id: string | number): Promise<AIInsightDO | null> {
    const [result] = await db.select().from(ai_insights).where(eq(ai_insights.id, Number(id)));
    return result || null;
  }

  async getAll(userId?: string): Promise<AIInsightDO[]> {
    if (userId) {
      return await db.select().from(ai_insights).where(eq(ai_insights.user_id, userId));
    }
    return await db.select().from(ai_insights);
  }

  async update(id: string | number, data: Partial<AIInsightDO>): Promise<AIInsightDO> {
    const [result] = await db
      .update(ai_insights)
      .set({ ...data, updated_at: new Date().toISOString() })
      .where(eq(ai_insights.id, Number(id)))
      .returning();
    return result;
  }

  async updateMany(updates: { id: string | number; data: Partial<AIInsightDO> }[]): Promise<AIInsightDO[]> {
    const results: AIInsightDO[] = [];
    
    // 逐个更新，因为批量更新在这种情况下较复杂
    for (const update of updates) {
      const result = await this.update(update.id, update.data);
      results.push(result);
    }
    
    return results;
  }

  async delete(id: string | number): Promise<boolean> {
    await db.delete(ai_insights).where(eq(ai_insights.id, Number(id)));
    return true;
  }

  async getByUserId(userId: string): Promise<AIInsightDO[]> {
    return await db.select().from(ai_insights).where(eq(ai_insights.user_id, userId));
  }

  async getPage(page: number, pageSize: number, userId?: string): Promise<{
    items: AIInsightDO[];
    total: number;
  }> {
    const offset = (page - 1) * pageSize;
    
    let query = db.select().from(ai_insights);
    if (userId) {
      query = query.where(eq(ai_insights.user_id, userId));
    }
    
    const items = await query.limit(pageSize).offset(offset);
    
    let countQuery = db.select({ count: db.fn.count() }).from(ai_insights);
    if (userId) {
      countQuery = countQuery.where(eq(ai_insights.user_id, userId));
    }
    
    const [{ count }] = await countQuery;
    
    return {
      items,
      total: Number(count)
    };
  }

  // 根据过滤条件获取数据
  async getWithFilters(
    page: number | null, 
    pageSize: number | null, 
    userId: string, 
    filters: Record<string, any> = {}
  ): Promise<{
    items: AIInsightDO[];
    total: number;
    page?: number;
    pageSize?: number;
  }> {
    // 构建查询条件
    const conditions = [eq(ai_insights.user_id, userId)];
    
    // 添加时间过滤
    if (filters.timePeriodStart) {
      conditions.push(gte(ai_insights.time_period_start, filters.timePeriodStart));
    }
    if (filters.timePeriodEnd) {
      conditions.push(lte(ai_insights.time_period_end, filters.timePeriodEnd));
    }
    
    // 添加类型过滤
    if (filters.kind) {
      conditions.push(eq(ai_insights.kind, filters.kind));
    }
    
    // 执行查询
    const query = db.select().from(ai_insights).where(and(...conditions));
    
    // 如果需要分页
    if (page !== null && pageSize !== null) {
      const offset = (page - 1) * pageSize;
      const items = await query.limit(pageSize).offset(offset);
      
      // 获取总数
      const [{ count }] = await db
        .select({ count: db.fn.count() })
        .from(ai_insights)
        .where(and(...conditions));
      
      return {
        items,
        total: Number(count),
        page,
        pageSize
      };
    } else {
      // 不分页，返回所有结果
      const items = await query;
      return {
        items,
        total: items.length
      };
    }
  }

  /**
   * 将过滤条件转换为 Drizzle 条件
   */
  private buildFilterConditions(filters: FilterOptions, userId?: string): SQL[] {
    const conditions: SQL[] = [];
    
    // 添加用户ID过滤
    if (userId) {
      conditions.push(eq(ai_insights.user_id, userId));
    }
    
    // 添加其他过滤条件
    if (filters.conditions && filters.conditions.length > 0) {
      for (const condition of filters.conditions) {
        const { field, operator, value } = condition;
        
        // 将字段名从驼峰转换为下划线
        const fieldName = field.replace(/([A-Z])/g, "_$1").toLowerCase();
        
        // 根据操作符构建条件
        switch (operator) {
          case 'eq':
            conditions.push(eq(ai_insights[fieldName as keyof typeof ai_insights], value));
            break;
          case 'neq':
            conditions.push(ne(ai_insights[fieldName as keyof typeof ai_insights], value));
            break;
          case 'gt':
            conditions.push(gt(ai_insights[fieldName as keyof typeof ai_insights], value));
            break;
          case 'gte':
            conditions.push(gte(ai_insights[fieldName as keyof typeof ai_insights], value));
            break;
          case 'lt':
            conditions.push(lt(ai_insights[fieldName as keyof typeof ai_insights], value));
            break;
          case 'lte':
            conditions.push(lte(ai_insights[fieldName as keyof typeof ai_insights], value));
            break;
          case 'like':
            conditions.push(ilike(ai_insights[fieldName as keyof typeof ai_insights], `%${value}%`));
            break;
          case 'in':
            if (Array.isArray(value)) {
              conditions.push(inArray(ai_insights[fieldName as keyof typeof ai_insights], value));
            }
            break;
          case 'between':
            if (Array.isArray(value) && value.length === 2) {
              conditions.push(
                between(ai_insights[fieldName as keyof typeof ai_insights], value[0], value[1])
              );
            }
            break;
        }
      }
    }
    
    return conditions;
  }

  /**
   * 使用过滤条件获取数据
   */
  async getWithFilters(
    filters: FilterOptions,
    userId?: string
  ): Promise<{
    items: AIInsightDO[];
    total: number;
    metadata?: Record<string, any>;
  }> {
    try {
      // 构建查询条件
      const conditions = this.buildFilterConditions(filters, userId);
      
      // 基础查询
      let query = db.select().from(ai_insights);
      
      // 添加条件
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      // 添加排序
      if (filters.sortBy) {
        const fieldName = filters.sortBy.replace(/([A-Z])/g, "_$1").toLowerCase();
        query = query.orderBy(
          filters.sortDirection === 'desc' 
            ? desc(ai_insights[fieldName as keyof typeof ai_insights]) 
            : asc(ai_insights[fieldName as keyof typeof ai_insights])
        );
      } else {
        // 默认按创建时间降序
        query = query.orderBy(desc(ai_insights.created_at));
      }
      
      // 添加限制和偏移
      if (filters.limit !== undefined) {
        query = query.limit(filters.limit);
      }
      
      if (filters.offset !== undefined) {
        query = query.offset(filters.offset);
      }
      
      // 执行查询
      const items = await query;
      
      // 计算总数
      let countQuery = db.select({ count: db.fn.count() }).from(ai_insights);
      if (conditions.length > 0) {
        countQuery = countQuery.where(and(...conditions));
      }
      const [{ count }] = await countQuery;
      
      return {
        items,
        total: Number(count)
      };
    } catch (error) {
      console.error('过滤查询失败:', error);
      throw error;
    }
  }

  /**
   * 带分页的过滤查询
   */
  async getPageWithFilters(
    page: number,
    pageSize: number,
    filters: FilterOptions,
    userId?: string
  ): Promise<{
    items: AIInsightDO[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    // 计算偏移量
    const offset = (page - 1) * pageSize;
    
    // 使用带限制和偏移的过滤查询
    const result = await this.getWithFilters(
      {
        ...filters,
        limit: pageSize,
        offset
      },
      userId
    );
    
    // 计算总页数
    const totalPages = Math.ceil(result.total / pageSize);
    
    return {
      items: result.items,
      total: result.total,
      page,
      pageSize,
      totalPages
    };
  }
}
