import 'server-only';

import { goals, habit_targets, habits ,HabitTarget} from '@/iac/drizzle/schema';
import { desc, eq } from 'drizzle-orm';


import { db } from './db';

// 目标相关数据库操作
export async function getGoalsInDB(userId: string) {
    try {
        const result = await db.select().from(goals)
            .where(eq(goals.user_id, userId))
            .orderBy(desc(goals.created_at))
            .innerJoin(habit_targets, eq(goals.id, habit_targets.goal_id))
            .innerJoin(habits, eq(habit_targets.habit_id, habits.id));
        return result;
    } catch (error) {
        console.error('获取目标失败:', error);
        return [];
    }
}

export async function getGoalByIdInDB(id: number) {
    try {
        const goal = await db.select().from(goals)
            .where(eq(goals.id, id))
            .leftJoin(habit_targets, eq(goals.id, habit_targets.goal_id))
            .leftJoin(habits, eq(habit_targets.habit_id, habits.id));

        return goal;
    } catch (error) {
        console.error('获取目标详情失败:', error);
        return null;
    }
}

export async function calculateGoalProgress(goalId: number) {
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
        const result = await db.insert(goals).values({ ...goalData }).returning();

        // Now insert the habit targets
        for (const targetData of habitTargets) {
            await createHabitTargetInDB({
                ...targetData,
                goalId: result[0].id,
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
    goalId: number;
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