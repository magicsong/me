import { db } from '@/lib/db';
import { ai_insights, insightKind } from '@../../lib/db/schema';
import { and, asc, desc, eq, gte, lte } from 'drizzle-orm';
import { InsightData, UpdateInsightData } from '../types/ai-insight';

/**
 * 创建新的 AI 洞察
 * @param data 洞察数据
 * @returns 创建的洞察记录
 */
export async function createAiInsight(data: InsightData) {
  try {
    const result = await db.insert(ai_insights).values(data).returning();
    return { success: true, data: result[0] };
  } catch (error) {
    console.error('Failed to create AI insight:', error);
    return { success: false, error: `创建AI洞察失败: ${error.message}` };
  }
}

/**
 * 通过ID获取单个AI洞察记录
 * @param id 洞察ID
 * @returns 洞察记录
 */
export async function getAiInsightById(id: number) {
  try {
    const result = await db.select().from(ai_insights).where(eq(ai_insights.id, id));
    return { success: true, data: result[0] || null };
  } catch (error) {
    console.error('Failed to get AI insight by ID:', error);
    return { success: false, error: `获取AI洞察失败: ${error.message}` };
  }
}

/**
 * 获取用户的所有AI洞察
 * @param userId 用户ID
 * @param limit 限制返回数量
 * @param offset 偏移量（分页）
 * @returns 用户的洞察记录列表
 */
export async function getAiInsightsByUser(userId: string, limit = 100, offset = 0) {
  try {
    const result = await db
      .select()
      .from(ai_insights)
      .where(eq(ai_insights.user_id, userId))
      .orderBy(desc(ai_insights.created_at))
      .limit(limit)
      .offset(offset);
    
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to get AI insights by user:', error);
    return { success: false, error: `获取用户AI洞察失败: ${error.message}` };
  }
}

/**
 * 按类型获取AI洞察
 * @param userId 用户ID
 * @param kind 洞察类型
 * @param limit 限制返回数量
 * @param offset 偏移量（分页）
 * @returns 特定类型的洞察记录列表
 */
export async function getAiInsightsByKind(userId: string, kind: typeof insightKind.enumValues[number], limit = 100, offset = 0) {
  try {
    const result = await db
      .select()
      .from(ai_insights)
      .where(and(
        eq(ai_insights.user_id, userId),
        eq(ai_insights.kind, kind)
      ))
      .orderBy(desc(ai_insights.created_at))
      .limit(limit)
      .offset(offset);
    
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to get AI insights by kind:', error);
    return { success: false, error: `获取特定类型AI洞察失败: ${error.message}` };
  }
}

/**
 * 获取最新的AI洞察
 * @param userId 用户ID
 * @param kind 洞察类型（可选）
 * @returns 最新的洞察记录
 */
export async function getLatestAiInsight(userId: string, kind?: typeof insightKind.enumValues[number]) {
  try {
    let query = db
      .select()
      .from(ai_insights)
      .where(eq(ai_insights.user_id, userId))
      .orderBy(desc(ai_insights.created_at))
      .limit(1);
    
    if (kind) {
      query = db
        .select()
        .from(ai_insights)
        .where(and(
          eq(ai_insights.user_id, userId),
          eq(ai_insights.kind, kind)
        ))
        .orderBy(desc(ai_insights.created_at))
        .limit(1);
    }
    
    const result = await query;
    return { success: true, data: result[0] || null };
  } catch (error) {
    console.error('Failed to get latest AI insight:', error);
    return { success: false, error: `获取最新AI洞察失败: ${error.message}` };
  }
}

/**
 * 按时间范围查询AI洞察
 * @param userId 用户ID
 * @param startDate 开始日期
 * @param endDate 结束日期
 * @param kind 洞察类型（可选）
 * @returns 符合条件的洞察记录
 */
export async function getAiInsightsByTimeRange(
  userId: string, 
  startDate: Date, 
  endDate: Date, 
  kind?: typeof insightKind.enumValues[number]
) {
  try {
    let query = db
      .select()
      .from(ai_insights)
      .where(and(
        eq(ai_insights.user_id, userId),
        gte(ai_insights.time_period_start, startDate),
        lte(ai_insights.time_period_end, endDate)
      ))
      .orderBy(desc(ai_insights.created_at));
    
    if (kind) {
      query = db
        .select()
        .from(ai_insights)
        .where(and(
          eq(ai_insights.user_id, userId),
          eq(ai_insights.kind, kind),
          gte(ai_insights.time_period_start, startDate),
          lte(ai_insights.time_period_end, endDate)
        ))
        .orderBy(desc(ai_insights.created_at));
    }
    
    const result = await query;
    console.log(result)
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to get AI insights by time range:', error);
    return { success: false, error: `按时间范围获取AI洞察失败: ${error.message}` };
  }
}

/**
 * 更新AI洞察
 * @param id 洞察ID
 * @param data 更新数据
 * @returns 更新后的洞察记录
 */
export async function updateAiInsight(id: number, data: UpdateInsightData) {
  try {
    const result = await db
      .update(ai_insights)
      .set({ ...data, updated_at: new Date() })
      .where(eq(ai_insights.id, id))
      .returning();
    
    return { success: true, data: result[0] || null };
  } catch (error) {
    console.error('Failed to update AI insight:', error);
    return { success: false, error: `更新AI洞察失败: ${error.message}` };
  }
}

/**
 * 删除AI洞察
 * @param id 洞察ID
 * @returns 操作结果
 */
export async function deleteAiInsight(id: number) {
  try {
    await db
      .delete(ai_insights)
      .where(eq(ai_insights.id, id));
    
    return { success: true };
  } catch (error) {
    console.error('Failed to delete AI insight:', error);
    return { success: false, error: `删除AI洞察失败: ${error.message}` };
  }
}

/**
 * 按照特定条件获取洞察，如果不存在则自动创建
 * @param userId 用户ID
 * @param kind 洞察类型
 * @param periodStart 时间范围开始
 * @param periodEnd 时间范围结束
 * @param createData 如需创建时的数据
 * @returns 洞察记录
 */
export async function getOrCreateAiInsight(
  userId: string,
  kind: typeof insightKind.enumValues[number],
  periodStart: Date,
  periodEnd: Date,
  createData: Omit<InsightData, 'user_id' | 'kind' | 'time_period_start' | 'time_period_end'>
) {
  try {
    // 查找现有记录
    const existing = await db
      .select()
      .from(ai_insights)
      .where(and(
        eq(ai_insights.user_id, userId),
        eq(ai_insights.kind, kind),
        eq(ai_insights.time_period_start, periodStart),
        eq(ai_insights.time_period_end, periodEnd)
      ))
      .limit(1);
    
    // 如果已存在，返回
    if (existing.length > 0) {
      return { success: true, data: existing[0], created: false };
    }
    
    // 不存在，创建新记录
    const newRecord = {
      user_id: userId,
      kind,
      time_period_start: periodStart,
      time_period_end: periodEnd,
      ...createData,
    };
    
    const result = await db.insert(ai_insights).values(newRecord).returning();
    return { success: true, data: result[0], created: true };
    
  } catch (error) {
    console.error('Failed in getOrCreateAiInsight:', error);
    return { success: false, error: `查找或创建AI洞察失败: ${error.message}` };
  }
}

/**
 * 批量插入AI洞察
 * @param insights 待插入的洞察数组
 * @returns 插入结果
 */
export async function bulkInsertAiInsights(insights: InsightData[]) {
  try {
    if (!insights.length) return { success: true, data: [] };
    
    const result = await db
      .insert(ai_insights)
      .values(insights)
      .returning();
      
    return { success: true, data: result };
  } catch (error) {
    console.error('Failed to bulk insert AI insights:', error);
    return { success: false, error: `批量创建AI洞察失败: ${error.message}` };
  }
}
