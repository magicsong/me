import { db } from '@/lib/db';
import { daily_summaries } from '@../../lib/db/schema';
import { eq, and, desc, sql, gte } from 'drizzle-orm';
import { auth } from '../auth';
import { getCurrentUserId } from '../utils';
import { subDays,format } from 'date-fns';

/**
 * 创建或更新每日总结
 */
export async function createOrUpdateDailySummary(date: string, content: any) {
    const userId = await getCurrentUserId();
  // 检查是否已存在该日期的总结
  const existingSummary = await db.select()
    .from(daily_summaries)
    .where(and(
      eq(daily_summaries.user_id, userId),
      eq(daily_summaries.date, date)
    ))
    .limit(1);
  
  if (existingSummary.length > 0) {
    // 更新现有总结
    return await db.update(daily_summaries)
      .set({
        content: content,
        updated_at: new Date().toISOString()
      })
      .where(eq(daily_summaries.id, existingSummary[0].id))
      .returning();
  } else {
    // 创建新总结
    return await db.insert(daily_summaries)
      .values({
        user_id: userId,
        date: date,
        content: content,
      })
      .returning();
  }
}

/**
 * 获取特定日期的每日总结
 */
export async function getDailySummary(date: string) {
  const userId = await getCurrentUserId();
  
  const summary = await db.select()
    .from(daily_summaries)
    .where(and(
      eq(daily_summaries.user_id, userId),
      eq(daily_summaries.date, date)
    ))
    .limit(1);
  
  return summary[0] || null;
}

/**
 * 检查特定日期是否已有总结
 */
export async function checkDailySummaryExists(date: string) {
    const userId = await getCurrentUserId();
  
  const count = await db.select({ count: sql`count(*)` })
    .from(daily_summaries)
    .where(and(
      eq(daily_summaries.user_id, userId),
      eq(daily_summaries.date, date)
    ));
  
  return count[0].count > 0;
}

/**
 * 获取最近的总结列表
 */
export async function getRecentDailySummaries(limit = 5) {
  const userId = await getCurrentUserId();
  
  return await db.select()
    .from(daily_summaries)
    .where(eq(daily_summaries.user_id, userId))
    .orderBy(desc(daily_summaries.date))
    .limit(limit);
}

/**
 * 删除特定日期的总结
 */
export async function deleteDailySummary(date: string) {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("未授权：需要用户登录");
    }
    const userId = session.user.id;
  
  return await db.delete(daily_summaries)
    .where(and(
      eq(daily_summaries.user_id, userId),
      eq(daily_summaries.date, date)
    ))
    .returning();
}

// 更新AI总结
export async function updateAIDailySummary(date: string, content: any, summaryType: string = 'daily') {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("未授权：需要用户登录");
    }
    const userId = session.user.id;
  
  return await db.update(daily_summaries)
    .set({
      ai_summary: content,
      summary_type: summaryType,  // 添加总结类型
      updated_at: new Date().toISOString()
    })
    .where(and(
      eq(daily_summaries.user_id, userId),
      eq(daily_summaries.date, date)
    ))
    .returning();
}

/**
 * 获取最近一周的数据，包括前六天的AI总结和最后一天的详细数据
 */
export async function getWeeklySummary(dateStr: string) {
  const userId = await getCurrentUserId();
  const targetDate = new Date(dateStr);
  const startDate = format(subDays(targetDate, 6), 'yyyy-MM-dd');
  
  // 获取最后一天的详细数据
  const lastDaySummary = await getDailySummary(dateStr);
  
  // 获取前六天的AI总结
  const previousDaysSummaries = await db.select()
    .from(daily_summaries)
    .where(and(
      eq(daily_summaries.user_id, userId),
      gte(daily_summaries.date, startDate)
    ))
    .orderBy(desc(daily_summaries.date))
    .limit(6);
  // 合并数据，创建周总结上下文
  return createWeeklySummaryContext(previousDaysSummaries, lastDaySummary);
}

/**
 * 创建周总结上下文
 */
function createWeeklySummaryContext(previousSummaries: any[], lastDaySummary: any) {
  const weeklyContext = {
    previousDaysSummaries: previousSummaries.map(s => `${s.date}: ${s.aiSummary}`).join('\n'),
    ...lastDaySummary
  };
  
  return weeklyContext;
}
