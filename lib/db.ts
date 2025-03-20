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
