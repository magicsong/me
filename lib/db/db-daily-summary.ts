import { db } from '@/lib/db';
import { daily_summaries } from '@../../iac/drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { auth } from '../auth';

/**
 * 创建或更新每日总结
 */
export async function createOrUpdateDailySummary(date: string, content: any) {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("未授权：需要用户登录");
    }
    const userId = session.user.id;
  
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
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("未授权：需要用户登录");
    }
    const userId = session.user.id;
  
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
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("未授权：需要用户登录");
    }
    const userId = session.user.id;
  
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
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("未授权：需要用户登录");
    }
    const userId = session.user.id;
  
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
