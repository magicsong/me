
import 'server-only';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import {
    pgTable,
    text,
    integer,
    jsonb,
    primaryKey,
    timestamp,
    serial,
} from 'drizzle-orm/pg-core';
import { eq, desc } from 'drizzle-orm';

// 使用与主数据库相同的连接池
const pool = new Pool({
    connectionString: process.env.POSTGRES_URL
});

const db = drizzle(pool);

// 定义表结构
export const goals = pgTable('goals', {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    type: text('type').notNull(),
    startDate: timestamp('start_date').notNull(),
    endDate: timestamp('end_date').notNull(),
    userId: text('user_id').notNull(),
    createdAt: timestamp('created_at').notNull().$default(() => new Date()),
});

export const habits = pgTable('habits', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    userId: text('user_id').notNull(),
});

export const habitTargets = pgTable('habit_targets', {
    id: serial('id').primaryKey(),
    habitId: integer('habit_id').notNull(),
    goalId: text('goal_id').notNull(),
    targetCompletionRate: integer('target_completion_rate').notNull(),
    currentCompletionRate: integer('current_completion_rate'),
    userId: text('user_id').notNull(),
});

// 定义类型
interface HabitTarget {
    habitId: number;
    goalId: string;
    targetCompletionRate: number;
    currentCompletionRate?: number;
    userId: string;
}

// 目标相关数据库操作
export async function getGoalsInDB(userId: string) {
    try {
        const result = await db.select().from(goals)
            .where(eq(goals.userId, userId))
            .orderBy(desc(goals.createdAt))
            .leftJoin(habitTargets, eq(goals.id, habitTargets.goalId))
            .leftJoin(habits, eq(habitTargets.habitId, habits.id));

        return result;
    } catch (error) {
        console.error('获取目标失败:', error);
        return [];
    }
}

export async function getGoalByIdInDB(id: string) {
    try {
        const goal = await db.select().from(goals)
            .where(eq(goals.id, id))
            .leftJoin(habitTargets, eq(goals.id, habitTargets.goalId))
            .leftJoin(habits, eq(habitTargets.habitId, habits.id));

        return goal;
    } catch (error) {
        console.error('获取目标详情失败:', error);
        return null;
    }
}

export async function calculateGoalProgress(goalId: string) {
    // 获取目标相关的习惯完成情况并计算进度
    // ...实现代码
}
export async function createGoalInDB(data: {
    title: string;
    description?: string;
    type: string;
    startDate: Date;
    endDate: Date;
    habitTargets: HabitTarget[];
    userId: string;
}) {
    try {
        const { habitTargets, ...goalData } = data;
        const goalId = crypto.randomUUID(); // Generate a unique ID

        const result = await db.insert(goals).values({ ...goalData, id: goalId }).returning();

        // Now insert the habit targets
        for (const targetData of habitTargets) {
            await createHabitTargetInDB({
                ...targetData,
                goalId,
            });
        }

        return result[0];
    } catch (error) {
        console.error('创建目标失败:', error);
        return null;
    }
}

export async function updateGoalInDB(id: string, data: Partial<{
    title: string;
    description?: string;
    type: string;
    startDate: Date;
    endDate: Date;
    habitTargets: HabitTarget[];
}>) {
    try {
        const result = await db.update(goals).set(data).where(eq(goals.id, id)).returning();
        return result[0];
    } catch (error) {
        console.error('更新目标失败:', error);
        return null;
    }
}
export async function deleteGoalInDB(id: string) {
    try {
        await db.delete(goals).where(eq(goals.id, id));
        return true;
    } catch (error) {
        console.error('删除目标失败:', error);
        return false;
    }
}

export async function getHabitTargetsByGoalIdInDB(goalId: string) {
    try {
        const result = await db.select().from(habitTargets)
            .where(eq(habitTargets.goalId, goalId))
            .leftJoin(habits, eq(habitTargets.habitId, habits.id));

        return result;
    } catch (error) {
        console.error('获取习惯目标失败:', error);
        return [];
    }
}
export async function createHabitTargetInDB(data: {
    habitId: number;
    goalId: string;
    targetCompletionRate: number;
    currentCompletionRate?: number;
    userId: string;
}) {
    try {
        const result = await db.insert(habitTargets).values(data).returning();
        return result[0];
    } catch (error) {
        console.error('创建习惯目标失败:', error);
        return null;
    }
}
export async function updateHabitTargetInDB(id: number, data: Partial<{
    targetCompletionRate: number;
    currentCompletionRate?: number;
}>) {
    try {
        const result = await db.update(habitTargets).set(data).where(eq(habitTargets.id, id)).returning();
        return result[0];
    } catch (error) {
        console.error('更新习惯目标失败:', error);
        return null;
    }
}
export async function deleteHabitTargetInDB(id: number) {
    try {
        await db.delete(habitTargets).where(eq(habitTargets.id, id));
        return true;
    } catch (error) {
        console.error('删除习惯目标失败:', error);
        return false;
    }
}