import 'server-only';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import {
  pgTable,
  text,
  integer,
  jsonb,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { eq, sql } from 'drizzle-orm';

// 使用与主数据库相同的连接池
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL
});

const db = drizzle(pool);

// 用户奖励表结构
export const userRewards = pgTable('user_rewards', {
  userId: text('user_id').notNull().primaryKey(),
  totalPoints: integer('total_points').notNull().default(0),
  // 存储各类别点数的JSON字段
  categoryPoints: jsonb('category_points').$type<{
    health?: number;
    productivity?: number;
    mindfulness?: number;
    learning?: number;
    social?: number;
    [key: string]: number | undefined;
  }>().default({}).notNull(),
  // 等级和成就可以根据需要扩展
  level: integer('level').notNull().default(1),
  updatedAt: text('updated_at').notNull().$default(() => new Date().toISOString()),
});

/**
 * 获取用户的奖励数据
 * @param userId 用户ID
 * @returns 用户奖励数据，包括总点数、类别点数、等级等
 */
export async function getUserRewardsFromDB(userId: string) {
  // 查询用户奖励记录
  const rewardsData = await db
    .select()
    .from(userRewards)
    .where(eq(userRewards.userId, userId))
    .limit(1);

  // 如果用户没有奖励记录，返回默认值
  if (rewardsData.length === 0) {
    return {
      totalPoints: 0,
      categoryPoints: {},
      level: 1,
      updatedAt: new Date().toISOString()
    };
  }

  return rewardsData[0];
}

/**
 * 更新用户奖励
 * @param userId 用户ID
 * @param points 要增加的点数(正数)或减少的点数(负数)
 * @param category 点数类别
 * @returns 更新后的用户奖励数据
 */
export async function updateUserRewardsInDB(userId: string, points: number, category?: string) {
  // 首先检查用户是否已有奖励记录
  const existingReward = await getUserRewardsFromDB(userId);
  
  // 如果没有记录，创建一个新记录
  if (!existingReward.userId) {
    const newCategoryPoints: Record<string, number> = {};
    if (category) {
      newCategoryPoints[category] = Math.max(0, points); // 确保不会有负值
    }
    
    const result = await db.insert(userRewards).values({
      userId,
      totalPoints: Math.max(0, points), // 确保不会有负值
      categoryPoints: newCategoryPoints,
      level: 1,
      updatedAt: new Date().toISOString()
    }).returning();
    
    return result[0];
  }
  
  // 更新现有记录
  let newTotalPoints = existingReward.totalPoints + points;
  newTotalPoints = Math.max(0, newTotalPoints); // 确保总点数不会为负
  
  let newCategoryPoints = { ...existingReward.categoryPoints };
  
  // 如果指定了类别，更新该类别的点数
  if (category) {
    const currentCategoryPoints = newCategoryPoints[category] || 0;
    newCategoryPoints[category] = Math.max(0, currentCategoryPoints + points); // 确保类别点数不会为负
  }
  
  // 计算新的等级 (每500点升一级)
  const newLevel = Math.max(1, Math.floor(newTotalPoints / 500) + 1);
  
  // 更新数据库
  const result = await db.update(userRewards)
    .set({
      totalPoints: newTotalPoints,
      categoryPoints: newCategoryPoints,
      level: newLevel,
      updatedAt: new Date().toISOString()
    })
    .where(eq(userRewards.userId, userId))
    .returning();
  
  return result[0];
}