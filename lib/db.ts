import 'server-only';

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import {
  pgTable,
  text,
  numeric,
  integer,
  timestamp,
  pgEnum,
  serial,
  boolean,
  date
} from 'drizzle-orm/pg-core';
import { count, eq, ilike, and, sql, desc } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL
});

export const db = drizzle(pool);

// 现有的枚举和产品表
export const statusEnum = pgEnum('status', ['active', 'inactive', 'archived']);

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  imageUrl: text('image_url').notNull(),
  name: text('name').notNull(),
  status: statusEnum('status').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  stock: integer('stock').notNull(),
  availableAt: timestamp('available_at').notNull()
});

// 习惯频率枚举
export const frequencyEnum = pgEnum('frequency', ['daily', 'weekly', 'monthly']);

// 习惯表
export const habits = pgTable('habits', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  frequency: frequencyEnum('frequency').notNull().default('daily'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  userId: text('user_id') // 如果系统支持多用户，这里可以关联到用户表
});

// 习惯完成记录表
export const habitEntries = pgTable('habit_entries', {
  id: serial('id').primaryKey(),
  habitId: integer('habit_id').references(() => habits.id).notNull(),
  completedAt: date('completed_at').defaultNow().notNull(),
  userId: text('user_id')  // 如果系统支持多用户，这里可以关联到用户表
});

export type SelectProduct = typeof products.$inferSelect;
export type SelectHabit = typeof habits.$inferSelect;
export type SelectHabitEntry = typeof habitEntries.$inferSelect;

export const insertProductSchema = createInsertSchema(products);
export const insertHabitSchema = createInsertSchema(habits);
export const insertHabitEntrySchema = createInsertSchema(habitEntries);

export async function getProducts(
  search: string,
  offset: number
): Promise<{
  products: SelectProduct[];
  newOffset: number | null;
  totalProducts: number;
}> {
  // Always search the full table, not per page
  if (search) {
    return {
      products: await db
        .select()
        .from(products)
        .where(ilike(products.name, `%${search}%`))
        .limit(1000),
      newOffset: null,
      totalProducts: 0
    };
  }

  if (offset === null) {
    return { products: [], newOffset: null, totalProducts: 0 };
  }

  let totalProducts = await db.select({ count: count() }).from(products);
  let moreProducts = await db.select().from(products).limit(5).offset(offset);
  let newOffset = moreProducts.length >= 5 ? offset + 5 : null;

  return {
    products: moreProducts,
    newOffset,
    totalProducts: totalProducts[0].count
  };
}

export async function deleteProductById(id: number) {
  await db.delete(products).where(eq(products.id, id));
}

// 习惯相关的数据库函数
export async function getHabitsFromDB() {
  const allHabits = await db.select().from(habits).orderBy(desc(habits.createdAt));
  
  // 获取今天的日期，用于检查今天是否完成
  const today = new Date();
  today.setHours(0, 0, 0, 0); // 设置为今天的开始时间
  
  // 为每个习惯获取完成记录
  const habitsWithProgress = await Promise.all(
    allHabits.map(async (habit) => {
      // 检查今天是否已完成
      const todayEntry = await db
        .select()
        .from(habitEntries)
        .where(
          and(
            eq(habitEntries.habitId, habit.id),
            eq(habitEntries.completedAt, today)
          )
        )
        .limit(1);
      
      // 计算连续完成天数 (streak)
      const entries = await db
        .select()
        .from(habitEntries)
        .where(eq(habitEntries.habitId, habit.id))
        .orderBy(desc(habitEntries.completedAt));
      
      let streak = 0;
      if (entries.length > 0) {
        const sortedDates = entries.map(entry => new Date(entry.completedAt)).sort((a, b) => b.getTime() - a.getTime());
        
        // 简单计算连续天数 (实际应用中可能需要更复杂的逻辑)
        let currentStreak = 0;
        let currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);
        
        for (const date of sortedDates) {
          const entryDate = new Date(date);
          entryDate.setHours(0, 0, 0, 0);
          
          // 如果日期是连续的，增加连续计数
          const dayDifference = (currentDate.getTime() - entryDate.getTime()) / (1000 * 3600 * 24);
          
          if (dayDifference <= 1) {
            currentStreak++;
            currentDate = entryDate;
            // 减少一天
            currentDate.setDate(currentDate.getDate() - 1);
          } else {
            break; // 连续断了，停止计数
          }
        }
        
        streak = currentStreak;
      }
      
      return {
        id: habit.id.toString(),
        name: habit.name,
        description: habit.description || '',
        frequency: habit.frequency,
        createdAt: habit.createdAt.toISOString(),
        completedToday: todayEntry.length > 0,
        streak: streak
      };
    })
  );
  
  return habitsWithProgress;
}

export async function createHabitInDB(name: string, description: string, frequency: string) {
  const result = await db.insert(habits).values({
    name,
    description: description || null,
    frequency: frequency as 'daily' | 'weekly' | 'monthly'
  }).returning();
  
  return result[0];
}

export async function deleteHabitFromDB(id: number) {
  // 首先删除所有关联的完成记录
  await db.delete(habitEntries).where(eq(habitEntries.habitId, id));
  // 然后删除习惯本身
  await db.delete(habits).where(eq(habits.id, id));
}

export async function completeHabitInDB(id: number, completed: boolean) {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // 设置为今天的开始时间
  
  // 检查今天是否已有记录
  const existingEntry = await db
    .select()
    .from(habitEntries)
    .where(
      and(
        eq(habitEntries.habitId, id),
        eq(habitEntries.completedAt, today)
      )
    )
    .limit(1);
  
  // 如果需要标记为完成且没有现有记录，则添加新记录
  if (completed && existingEntry.length === 0) {
    await db.insert(habitEntries).values({
      habitId: id,
      completedAt: today
    });
    return true;
  }
  
  // 如果需要标记为未完成且有记录，则删除记录
  if (!completed && existingEntry.length > 0) {
    await db.delete(habitEntries).where(
      and(
        eq(habitEntries.habitId, id),
        eq(habitEntries.completedAt, today)
      )
    );
    return false;
  }
  
  // 返回当前状态
  return existingEntry.length > 0;
}

// 获取习惯历史记录
export async function getHabitHistoryFromDB(habitId: number) {
  const entries = await db
    .select()
    .from(habitEntries)
    .where(eq(habitEntries.habitId, habitId))
    .orderBy(desc(habitEntries.completedAt));
  
  // 返回完成日期的数组
  return entries.map(entry => entry.completedAt);
}

// 获取习惯统计数据
export async function getHabitStatsFromDB(timeRange: 'week' | 'month' | 'year' = 'week') {
  // 计算日期范围
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let startDate = new Date(today);
  let periodLabel = '';
  
  switch (timeRange) {
    case 'week':
      // 设置为本周的第一天（周一）
      const dayOfWeek = today.getDay() || 7;
      startDate.setDate(today.getDate() - dayOfWeek + 1);
      periodLabel = `${startDate.getFullYear()}年第${getWeekNumber(today)}周`;
      break;
    case 'month':
      // 设置为本月的第一天
      startDate.setDate(1);
      periodLabel = `${startDate.getFullYear()}年${startDate.getMonth() + 1}月`;
      break;
    case 'year':
      // 设置为今年的第一天
      startDate = new Date(today.getFullYear(), 0, 1);
      periodLabel = `${startDate.getFullYear()}年`;
      break;
  }
  
  // 获取所有习惯
  const allHabits = await db.select().from(habits);
  
  // 没有习惯时返回空数据
  if (allHabits.length === 0) {
    return {
      overallCompletionRate: 0,
      periodLabel,
      bestHabit: null,
      worstHabit: null,
      habitStats: [],
      dailyTrend: []
    };
  }
  
  // 获取日期范围内的所有完成记录
  const entries = await db
    .select()
    .from(habitEntries)
    .where(sql`${habitEntries.completedAt} >= ${startDate} AND ${habitEntries.completedAt} <= ${today}`)
    .orderBy(habitEntries.completedAt);
  
  // 计算每个习惯的统计数据
  const habitStatsMap = new Map();
  
  // 初始化每个习惯的统计数据
  for (const habit of allHabits) {
    habitStatsMap.set(habit.id, {
      id: habit.id.toString(),
      name: habit.name,
      completedDays: 0,
      possibleDays: getDayCount(startDate, today, habit.frequency),
      streak: 0,
      totalCompletions: 0,
      missedDays: 0
    });
  }
  
  // 更新完成天数
  for (const entry of entries) {
    const stats = habitStatsMap.get(entry.habitId);
    if (stats) {
      stats.completedDays += 1;
      stats.totalCompletions += 1;
    }
  }
  
  // 计算每个习惯的完成率和缺失天数
  const habitStats = [];
  let totalCompletionRate = 0;
  
  for (const [id, stats] of habitStatsMap.entries()) {
    // 计算完成率 (如果没有可能的天数，则为0)
    stats.completionRate = stats.possibleDays > 0 ? stats.completedDays / stats.possibleDays : 0;
    
    // 计算缺失天数
    stats.missedDays = stats.possibleDays - stats.completedDays;
    
    // 计算连续天数 (与前面的getHabitsFromDB函数类似的逻辑)
    const habitEntryDates = await db
      .select()
      .from(habitEntries)
      .where(eq(habitEntries.habitId, id))
      .orderBy(desc(habitEntries.completedAt));
    
    // 计算streak
    let streak = 0;
    if (habitEntryDates.length > 0) {
      let currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      
      for (const entry of habitEntryDates) {
        const entryDate = new Date(entry.completedAt);
        entryDate.setHours(0, 0, 0, 0);
        
        const dayDifference = (currentDate.getTime() - entryDate.getTime()) / (1000 * 3600 * 24);
        
        if (dayDifference <= 1) {
          streak++;
          currentDate = new Date(entryDate);
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      }
    }
    
    stats.streak = streak;
    habitStats.push(stats);
    
    // 累加完成率以计算平均值
    totalCompletionRate += stats.completionRate;
  }
  
  // 计算总体完成率
  const overallCompletionRate = habitStats.length > 0 ? totalCompletionRate / habitStats.length : 0;
  
  // 找出最佳和最差的习惯
  const sortedHabits = [...habitStats].sort((a, b) => b.completionRate - a.completionRate);
  const bestHabit = sortedHabits.length > 0 ? sortedHabits[0] : null;
  const worstHabit = sortedHabits.length > 1 ? sortedHabits[sortedHabits.length - 1] : null;
  
  // 生成日期范围内每天的完成趋势数据
  const dailyTrend = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= today) {
    const formattedDate = `${currentDate.getMonth() + 1}/${currentDate.getDate()}`;
    const dayCompletions = entries.filter(entry => {
      const entryDate = new Date(entry.completedAt);
      return entryDate.getFullYear() === currentDate.getFullYear() &&
             entryDate.getMonth() === currentDate.getMonth() &&
             entryDate.getDate() === currentDate.getDate();
    }).length;
    
    // 计算当天的完成率
    const completionRate = allHabits.length > 0 ? dayCompletions / allHabits.length : 0;
    
    dailyTrend.push({
      date: formattedDate,
      completionRate
    });
    
    // 前进一天
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return {
    overallCompletionRate,
    periodLabel,
    bestHabit,
    worstHabit,
    habitStats,
    dailyTrend
  };
}

// 辅助函数：获取日期范围内的天数
function getDayCount(startDate: Date, endDate: Date, frequency: string): number {
  const oneDay = 24 * 60 * 60 * 1000; // 一天的毫秒数
  const diffDays = Math.round(Math.abs((endDate.getTime() - startDate.getTime()) / oneDay)) + 1;
  
  switch (frequency) {
    case 'daily':
      return diffDays;
    case 'weekly':
      // 计算期间有多少周一
      let count = 0;
      const tempDate = new Date(startDate);
      while (tempDate <= endDate) {
        if (tempDate.getDay() === 1) { // 星期一
          count++;
        }
        tempDate.setDate(tempDate.getDate() + 1);
      }
      return Math.max(1, count); // 至少返回1
    case 'monthly':
      // 计算有多少个月初
      const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
                    endDate.getMonth() - startDate.getMonth() + 
                    (startDate.getDate() === 1 ? 1 : 0);
      return Math.max(1, months); // 至少返回1
    default:
      return diffDays;
  }
}

// 辅助函数：获取某一天是一年中的第几周
function getWeekNumber(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNumber = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}
