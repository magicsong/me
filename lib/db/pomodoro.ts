import 'server-only';

import { db } from './llm';
import { 
  pomodoros, 
  pomodoro_tags, 
  pomodoro_tag_relations 
} from '../../iac/drizzle/schema';
import { count, eq, ilike, and, sql, desc, between, gt, lt, isNull } from 'drizzle-orm';

// 创建新的番茄钟
export async function createPomodoro({
  title,
  description,
  duration = 25,
  userId,
  habitId,
  goalId,
  tagIds = []
}: {
  title: string;
  description?: string;
  duration?: number;
  userId: string;
  habitId?: number;
  goalId?: number;
  tagIds?: number[];
}) {
  try {
    const startTime = new Date();
    const result = await db.insert(pomodoros).values({
      title,
      description,
      duration,
      status: 'running',
      start_time: startTime,
      user_id: userId,
      habit_id: habitId,
      goal_id: goalId,
    }).returning();

    const newPomodoro = result[0];

    // 添加标签关联
    if (tagIds.length > 0 && newPomodoro) {
      const tagRelations = tagIds.map(tagId => ({
        pomodoro_id: newPomodoro.id,
        tag_id: tagId
      }));
      
      await db.insert(pomodoro_tag_relations).values(tagRelations);
    }

    return newPomodoro;
  } catch (error) {
    console.error('创建番茄钟失败:', error);
    throw error;
  }
}

// 更新番茄钟状态
export async function updatePomodoroStatus(id: number, status: 'running' | 'completed' | 'canceled' | 'paused') {
  try {
    const updateData: any = { status };
    
    // 如果状态是已完成或已取消，设置结束时间
    if (status === 'completed' || status === 'canceled') {
      updateData.end_time = new Date();
    }
    
    const result = await db.update(pomodoros)
      .set(updateData)
      .where(eq(pomodoros.id, id))
      .returning();
      
    return result[0];
  } catch (error) {
    console.error('更新番茄钟状态失败:', error);
    throw error;
  }
}

// 获取用户的番茄钟列表
export async function getUserPomodoros(
  userId: string, 
  status?: 'running' | 'completed' | 'canceled' | 'paused', 
  limit = 20, 
  offset = 0, 
  date?: string
) {
  try {
    let whereConditions = eq(pomodoros.user_id, userId);
    
    if (status) {
      whereConditions = and(whereConditions, eq(pomodoros.status, status));
    }
    
    // 添加对日期的过滤
    if (date) {
      const startOfDay = new Date(date);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      whereConditions = and(
        whereConditions, 
        between(pomodoros.start_time, startOfDay, endOfDay)
      );
    }
    
    let query = db.select({
      pomodoro: pomodoros,
      tagsCount: count(pomodoro_tag_relations.tag_id)
    })
    .from(pomodoros)
    .leftJoin(pomodoro_tag_relations, eq(pomodoros.id, pomodoro_tag_relations.pomodoro_id))
    .where(whereConditions)
    .groupBy(pomodoros.id)
    .orderBy(desc(pomodoros.created_at))
    .limit(limit)
    .offset(offset);
    
    return await query;
  } catch (error) {
    console.error('获取番茄钟列表失败:', error);
    throw error;
  }
}

// 获取番茄钟详情（包含关联的标签）
export async function getPomodoroDetails(id: number) {
  try {
    const pomodoro = await db.select()
      .from(pomodoros)
      .where(eq(pomodoros.id, id))
      .limit(1);
      
    if (pomodoro.length === 0) {
      return null;
    }
    
    const tags = await db.select({
      tag: pomodoro_tags
    })
    .from(pomodoro_tags)
    .innerJoin(
      pomodoro_tag_relations, 
      eq(pomodoro_tags.id, pomodoro_tag_relations.tag_id)
    )
    .where(eq(pomodoro_tag_relations.pomodoro_id, id));
    
    return {
      ...pomodoro[0],
      tags: tags.map(t => t.tag)
    };
  } catch (error) {
    console.error('获取番茄钟详情失败:', error);
    throw error;
  }
}

// 创建番茄钟标签
export async function createPomodoroTag(name: string, color: string, userId: string) {
  try {
    const result = await db.insert(pomodoro_tags)
      .values({ name, color, user_id: userId })
      .returning();
      
    return result[0];
  } catch (error) {
    console.error('创建番茄钟标签失败:', error);
    throw error;
  }
}

// 获取用户的番茄钟标签
export async function getUserPomodoroTags(userId: string) {
  try {
    return await db.select()
      .from(pomodoro_tags)
      .where(eq(pomodoro_tags.user_id, userId))
      .orderBy(pomodoro_tags.name);
  } catch (error) {
    console.error('获取用户番茄钟标签失败:', error);
    throw error;
  }
}

// 获取用户的番茄钟统计信息
export async function getUserPomodoroStats(userId: string, startDate?: Date, endDate?: Date) {
  try {
    let whereClause = eq(pomodoros.user_id, userId);
    
    if (startDate && endDate) {
      whereClause = and(
        whereClause,
        between(pomodoros.start_time, startDate, endDate)
      );
    } else if (startDate) {
      whereClause = and(
        whereClause,
        gt(pomodoros.start_time, startDate)
      );
    } else if (endDate) {
      whereClause = and(
        whereClause,
        lt(pomodoros.start_time, endDate)
      );
    }
    
    const totalPomodoros = await db.select({ count: count() })
      .from(pomodoros)
      .where(whereClause);
      
    const completedPomodoros = await db.select({ count: count() })
      .from(pomodoros)
      .where(and(
        whereClause,
        eq(pomodoros.status, 'completed')
      ));
      
    const canceledPomodoros = await db.select({ count: count() })
      .from(pomodoros)
      .where(and(
        whereClause,
        eq(pomodoros.status, 'canceled')
      ));
      
    const activePomodoros = await db.select({ count: count() })
      .from(pomodoros)
      .where(and(
        whereClause,
        eq(pomodoros.status, 'running')
      ));
      
    // 计算总专注时间（分钟）- 仅考虑已完成的番茄钟
    const totalTime = await db.select({
      total: sql<number>`COALESCE(SUM(${pomodoros.duration}), 0)`
    })
    .from(pomodoros)
    .where(and(
      whereClause,
      eq(pomodoros.status, 'completed')
    ));
    
    return {
      total: totalPomodoros[0].count,
      completed: completedPomodoros[0].count,
      canceled: canceledPomodoros[0].count,
      active: activePomodoros[0].count,
      totalMinutes: totalTime[0].total
    };
  } catch (error) {
    console.error('获取番茄钟统计信息失败:', error);
    throw error;
  }
}
