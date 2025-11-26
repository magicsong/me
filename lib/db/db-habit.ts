import { habit_challenge_tiers, habit_entries, habits, habit_stats, habit_difficulties as habitDifficulties } from "@/lib/db/schema";
import { and, desc, eq, sql } from 'drizzle-orm';
import {
    date,
    integer,
    pgEnum,
    pgTable,
    serial,
    text
} from 'drizzle-orm/pg-core';
import { db } from './pool';
import { HabitEntry, HabitEntryService } from "../persist/habit-entry";
import { HabitData } from "../persist/habit";

// todo: remove this
export const habitEntries = pgTable('habit_entries', {
    id: serial('id').primaryKey(),
    habitId: integer('habit_id').references(() => habits.id).notNull(),
    completedAt: date('completed_at').defaultNow().notNull(),
    userId: text('user_id'),  // 如果系统支持多用户，这里可以关联到用户表
    tierId: integer('tier_id')
});

// 难度级别枚举
export const difficultyEnum = pgEnum('difficulty', ['easy', 'medium', 'hard']);

// 获取习惯及其挑战阶梯
export async function getHabitByIdDB(id: number, userId: string): Promise<Partial<HabitData> | null> {
    // 获取习惯基本信息
    const habit = await db.select().from(habits).where(and(eq(habits.id, id), eq(habits.user_id, userId))).limit(1);

    if (habit.length === 0) {
        return null;
    }

    // 获取该习惯的所有挑战阶梯
    const tiers = await db.select()
        .from(habit_challenge_tiers)
        .where(and(
            eq(habit_challenge_tiers.habit_id, id),
            eq(habit_challenge_tiers.user_id, userId)
        ))
        .orderBy(habit_challenge_tiers.level);

    // 获取今天的完成情况和挑战阶梯信息
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateEntries = await db
        .select({
            id: habit_entries.id,
            tier_id: habit_entries.tier_id,
            tier_name: habit_challenge_tiers.name,
            tier_level: habit_challenge_tiers.level,
            tier_reward_points: habit_challenge_tiers.reward_points
        })
        .from(habit_entries)
        .leftJoin(
            habit_challenge_tiers,
            eq(habit_entries.tier_id, habit_challenge_tiers.id)
        )
        .where(
            and(
                eq(habit_entries.habit_id, id),
                eq(habit_entries.completed_at, today),
                eq(habit_entries.user_id, userId)
            )
        )
        .limit(1);

    // 获取习惯的统计数据
    const statsData = await db.select()
        .from(habit_stats)
        .where(and(
            eq(habit_stats.habit_id, id),
            eq(habit_stats.user_id, userId)
        ))
        .limit(1);
    
    const stats = statsData.length > 0 ? statsData[0] : {
        total_check_ins: 0,
        current_streak: 0,
        longest_streak: 0,
        completion_rate: 0,
        failed_count: 0,
        last_check_in_date: null
    };

    const completedEntry = dateEntries.length > 0 ? dateEntries[0] : null;

    // 返回包含挑战阶梯、当前完成状态和统计数据的习惯信息
    return {
        ...habit[0],
        challenge_tiers: tiers || [],
        completedToday: dateEntries.length > 0,
        completed_tier: completedEntry && completedEntry.tier_id ? {
            id: completedEntry.tier_id,
            name: completedEntry.tier_name,
            level: completedEntry.tier_level,
            reward_points: completedEntry.tier_reward_points
        } : null,
        stats: stats
    };
}

// 习惯相关的数据库函数
export async function getHabitsFromDB(userId: string, targetDate?: Date): Promise<Partial<HabitData>[]> {
    const allHabits = await db.select().from(habits)
        .where(eq(habits.user_id, userId))
        .orderBy(desc(habits.created_at));

    // 获取目标日期，如果没提供就用今天
    const checkDate = targetDate || new Date();
    checkDate.setHours(0, 0, 0, 0); // 设置为当天的开始时间

    // 获取所有习惯的统计数据
    const allStats = await db.select()
        .from(habit_stats)
        .where(eq(habit_stats.user_id, userId));

    // 创建习惯ID到统计数据的映射
    const statsMap = new Map();
    allStats.forEach(stat => {
        statsMap.set(stat.habit_id, stat);
    });

    // 为每个习惯获取完成记录
    const habitsWithProgress = await Promise.all(
        allHabits.map(async (habit) => {
            // 检查目标日期是否已完成，同时获取挑战阶梯信息
            const dateEntries = await db
                .select({
                    id: habit_entries.id,
                    tier_id: habit_entries.tier_id,
                    tier_name: habit_challenge_tiers.name,
                    tier_level: habit_challenge_tiers.level,
                    tier_reward_points: habit_challenge_tiers.reward_points
                })
                .from(habit_entries)
                .leftJoin(
                    habit_challenge_tiers,
                    eq(habit_entries.tier_id, habit_challenge_tiers.id)
                )
                .where(
                    and(
                        eq(habit_entries.habit_id, habit.id),
                        eq(habit_entries.completed_at, checkDate),
                        eq(habit_entries.user_id, userId)
                    )
                )
                .limit(1);

            // 获取此习惯的所有挑战阶梯
            const challengeTiers = await db
                .select()
                .from(habit_challenge_tiers)
                .where(and(
                    eq(habit_challenge_tiers.habit_id, habit.id),
                    eq(habit_challenge_tiers.user_id, userId)
                ))
                .orderBy(habit_challenge_tiers.level);

            const completedEntry = dateEntries.length > 0 ? dateEntries[0] : null;
            
            // 获取习惯的统计数据
            const stats = statsMap.get(habit.id) || {
                total_check_ins: 0,
                current_streak: 0,
                longest_streak: 0,
                completion_rate: 0,
                failed_count: 0,
                last_check_in_date: null
            };

            return {
                id: habit.id,
                name: habit.name,
                description: habit.description || '',
                frequency: habit.frequency,
                createdAt: habit.created_at,
                completedToday: dateEntries.length > 0,
                category: habit.category,
                rewardPoints: habit.reward_points,
                // 添加挑战相关信息
                challenge_tiers: challengeTiers,
                completed_tier: completedEntry && completedEntry.tier_id ? {
                    id: completedEntry.tier_id,
                    name: completedEntry.tier_name,
                    level: completedEntry.tier_level,
                    reward_points: completedEntry.tier_reward_points
                } : null,
                // 添加统计数据
                stats: stats
            };
        })
    );

    return habitsWithProgress;
}

export async function createHabitInDB(name: string, description: string, frequency: string, userId: string, category: string, rewardPoints: number, scheduledDays?: number[]) {
    const result = await db.insert(habits).values({
        name,
        description: description || null,
        frequency: frequency as 'daily' | 'weekly' | 'monthly',
        user_id: userId,
        category: category || null,
        reward_points: rewardPoints || 1,
        scheduled_days: scheduledDays || []
    }).returning();

    return result[0];
}

export async function deleteHabitFromDB(id: number, userId: string) {
    // 首先删除所有关联的完成记录
    await db.delete(habitEntries).where(
        and(
            eq(habitEntries.habitId, id),
        )
    );
    // 然后删除习惯本身
    await db.delete(habits).where(
        and(
            eq(habits.id, id),
            eq(habits.user_id, userId)
        )
    );
}

export async function completeHabitInDB(id: number, completed: boolean, userId: string, tierId?: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 设置为今天的开始时间

    // 检查今天是否已有记录
    const existingEntry = await db
        .select()
        .from(habit_entries)
        .where(
            and(
                eq(habit_entries.habit_id, id),
                eq(habit_entries.completed_at, today),
                eq(habit_entries.user_id, userId)
            )
        )
        .limit(1);

    // 如果需要标记为完成且没有现有记录，则添加新记录
    if (completed && existingEntry.length === 0) {
        await db.insert(habit_entries).values({
            habit_id: id,
            completed_at: today,
            user_id: userId,
            tier_id: tierId || null
        });
        return true;
    }

    // 如果需要标记为未完成且有记录，则删除记录
    if (!completed && existingEntry.length > 0) {
        await db.delete(habit_entries).where(
            and(
                eq(habit_entries.habit_id, id),
                eq(habit_entries.completed_at, today),
                eq(habit_entries.user_id, userId)
            )
        );
        return false;
    }

    // 如果已完成并存在记录，但需要更新挑战阶梯
    if (completed && existingEntry.length > 0 && tierId !== undefined && tierId !== existingEntry[0].tier_id) {
        await db.update(habit_entries)
            .set({ tier_id: tierId })
            .where(
                and(
                    eq(habit_entries.habit_id, id),
                    eq(habit_entries.completed_at, today),
                    eq(habit_entries.user_id, userId)
                )
            );
    }

    // 返回当前状态
    return existingEntry.length > 0;
}

// 在特定日期完成习惯
export async function completeHabitOnDateInDB(habitId: number, userId: string, targetDate: Date, tierId?: number) {
    // 将日期设置为当天的开始时间（0点0分0秒）
    const normalizedDate = new Date(targetDate);
    normalizedDate.setHours(0, 0, 0, 0);

    // 检查指定日期是否已有记录
    const existingEntry = await db
        .select()
        .from(habit_entries)
        .where(
            and(
                eq(habit_entries.habit_id, habitId),
                eq(habit_entries.completed_at, normalizedDate),
                eq(habit_entries.user_id, userId)
            )
        )
        .limit(1);

    // 如果已存在记录但需要更新挑战阶梯
    if (existingEntry.length > 0) {
        if (tierId !== undefined && tierId !== existingEntry[0].tier_id) {
            await db.update(habit_entries)
                .set({ tier_id: tierId })
                .where(
                    and(
                        eq(habit_entries.id, existingEntry[0].id),
                        eq(habit_entries.user_id, userId)
                    )
                );
        }
        return existingEntry[0].id;
    }

    // 检查日期是否在未来
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (normalizedDate > today) {
        throw new Error('不能在未来日期补打卡');
    }

    // 添加补打卡记录
    const result = await db.insert(habit_entries).values({
        habit_id: habitId,
        completed_at: normalizedDate,
        user_id: userId,
        tier_id: tierId || null
    }).returning();

    return result[0].id;
}

// 定义习惯历史条目类型
export interface HabitHistoryEntry {
    date: Date;
    completed: boolean;
    difficulty?: 'easy' | 'medium' | 'hard' | null;
    comment?: string | null;
}

// 获取习惯历史记录
export async function getHabitHistoryFromDB(habitId: number, userId: string): Promise<HabitEntry[]> {
    // 使用JOIN查询同时获取完成记录、挑战阶梯和难度评价
    const service = new HabitEntryService();
    return await service.getEntriesByHabitId(habitId,userId)
}

export async function updateHabitInDB(id: number, userId: string, data: {
    name: string;
    description?: string;
    frequency?: 'daily' | 'weekly' | 'monthly';
    category?: string;
    rewardPoints?: number;
    isPinned?: boolean;
    scheduledDays?: number[];
}) {
    const { name, description, frequency, category, rewardPoints, isPinned, scheduledDays } = data;

    await db.update(habits).set({
        name,
        description,
        frequency,
        category,
        reward_points: rewardPoints,
        is_pinned: isPinned,
        scheduled_days: scheduledDays
    }).where(
        and(
            eq(habits.id, id),
            eq(habits.user_id, userId)
        )
    );
}
// 保存难度评价到数据库
export async function saveHabitDifficultyInDB(
    habitId: number,
    userId: string,
    difficulty: string,
    comment?: string
) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 检查是否已有今天的难度评价
    const existingDifficulty = await db
        .select()
        .from(habitDifficulties)
        .where(
            and(
                eq(habitDifficulties.habit_id, habitId),
                eq(habitDifficulties.user_id, userId),
                eq(habitDifficulties.completed_at, today)
            )
        )
        .limit(1);

    // 如果已存在今天的评价，则更新它
    if (existingDifficulty.length > 0) {
        await db.update(habitDifficulties)
            .set({
                difficulty: difficulty as 'easy' | 'medium' | 'hard',
                comment: comment || null
            })
            .where(
                and(
                    eq(habitDifficulties.habit_id, habitId),
                    eq(habitDifficulties.user_id, userId),
                    eq(habitDifficulties.completed_at, today)
                )
            );
        return existingDifficulty[0].id;
    }

    // 否则创建新评价
    const result = await db.insert(habitDifficulties).values({
        habitId,
        userId,
        completedAt: today,
        difficulty: difficulty as 'easy' | 'medium' | 'hard',
        comment: comment || null
    }).returning();

    return result[0].id;
}

// 获取习惯的难度历史
export async function getHabitDifficultyHistoryFromDB(habitId: number, userId: string) {
    // 获取所有该习惯的难度评价
    const difficulties = await db
        .select()
        .from(habitDifficulties)
        .where(
            and(
                eq(habitDifficulties.habit_id, habitId),
                eq(habitDifficulties.user_id, userId)
            )
        )
        .orderBy(desc(habitDifficulties.completed_at))
        .limit(20);

    // 统计各难度次数
    const counts = {
        easy: 0,
        medium: 0,
        hard: 0
    };

    difficulties.forEach(entry => {
        counts[entry.difficulty as 'easy' | 'medium' | 'hard']++;
    });

    // 获取最近5次评价
    const lastFive = difficulties.slice(0, 5).map(entry => entry.difficulty);

    return {
        easy: counts.easy,
        medium: counts.medium,
        hard: counts.hard,
        lastFive,
        // 包括最近的评价及评论
        recentEvaluations: difficulties.slice(0, 5).map(entry => ({
            difficulty: entry.difficulty,
            date: entry.completedAt,
            comment: entry.comment
        }))
    };
}

// 添加习惯挑战阶梯相关的数据库函数

// 创建习惯挑战阶梯
export async function createHabitTierInDB(habitId: number, userId: string, tierData: {
    name: string;
    level: number;
    description?: string;
    reward_points: number;
    completion_criteria?: any;
}) {
    const result = await db.insert(habit_challenge_tiers).values({
        habit_id: habitId,
        user_id: userId,
        name: tierData.name,
        level: tierData.level,
        description: tierData.description || null,
        reward_points: tierData.reward_points,
        completion_criteria: tierData.completion_criteria || {}
    }).returning();

    return result[0];
}

// 获取习惯的所有挑战阶梯
export async function getHabitTiersFromDB(habitId: number, userId: string) {
    const tiers = await db.select()
        .from(habit_challenge_tiers)
        .where(and(
            eq(habit_challenge_tiers.habit_id, habitId),
            eq(habit_challenge_tiers.user_id, userId)
        ))
        .orderBy(habit_challenge_tiers.level);

    return tiers;
}

// 更新习惯挑战阶梯
export async function updateHabitTierInDB(tierId: number, userId: string, tierData: {
    name?: string;
    level?: number;
    description?: string;
    reward_points?: number;
    completion_criteria?: any;
}) {
    const result = await db.update(habit_challenge_tiers)
        .set({
            name: tierData.name,
            level: tierData.level,
            description: tierData.description,
            reward_points: tierData.reward_points,
            completion_criteria: tierData.completion_criteria
        })
        .where(and(
            eq(habit_challenge_tiers.id, tierId),
            eq(habit_challenge_tiers.user_id, userId)
        ))
        .returning();

    return result[0];
}

// 删除习惯挑战阶梯
export async function deleteHabitTierFromDB(tierId: number, userId: string) {
    // 首先更新所有使用此阶梯的记录
    await db.update(habit_entries)
        .set({ tier_id: null })
        .where(eq(habit_entries.tier_id, tierId));

    // 然后删除阶梯
    await db.delete(habit_challenge_tiers)
        .where(and(
            eq(habit_challenge_tiers.id, tierId),
            eq(habit_challenge_tiers.user_id, userId)
        ));
}

// 获取习惯的统计信息，包含挑战阶梯完成情况
export async function getHabitTierStatsFromDB(habitId: number, userId: string) {
    // 获取所有的挑战阶梯
    const tiers = await getHabitTiersFromDB(habitId, userId);

    // 统计每个阶梯完成的次数
    const tierStats = await Promise.all(tiers.map(async tier => {
        const completions = await db
            .select({ count: sql`count(*)` })
            .from(habit_entries)
            .where(and(
                eq(habit_entries.habit_id, habitId),
                eq(habit_entries.user_id, userId),
                eq(habit_entries.tier_id, tier.id)
            ));

        return {
            id: tier.id,
            name: tier.name,
            level: tier.level,
            reward_points: tier.reward_points,
            completion_count: parseInt(completions[0].count.toString())
        };
    }));

    // 获取没有指定阶梯的完成次数
    const defaultCompletions = await db
        .select({ count: sql`count(*)` })
        .from(habit_entries)
        .where(and(
            eq(habit_entries.habit_id, habitId),
            eq(habit_entries.user_id, userId),
            sql`${habit_entries.tier_id} IS NULL`
        ));

    const noTierCount = parseInt(defaultCompletions[0].count.toString());

    return {
        tierStats,
        defaultCompletionCount: noTierCount,
        totalTiers: tiers.length
    };
}

// 获取习惯的统计数据
export async function getHabitStatsFromDB(habitId: number, userId: string) {
    const stats = await db.select()
        .from(habit_stats)
        .where(and(
            eq(habit_stats.habit_id, habitId),
            eq(habit_stats.user_id, userId)
        ))
        .limit(1);

    return stats.length > 0 ? stats[0] : null;
}

// 获取用户所有习惯的统计数据
export async function getAllHabitStatsForUserFromDB(userId: string) {
    return await db.select()
        .from(habit_stats)
        .where(eq(habit_stats.user_id, userId));
}

// 获取用户所有习惯的基本信息和统计数据
export async function getHabitsWithStatsFromDB(userId: string) {
    const userHabits = await db.select()
        .from(habits)
        .where(eq(habits.user_id, userId))
        .orderBy(desc(habits.created_at));

    const habitsWithStats = await Promise.all(
        userHabits.map(async (habit) => {
            const stats = await getHabitStatsFromDB(habit.id, userId);
            
            return {
                ...habit,
                stats: stats || {
                    total_check_ins: 0,
                    current_streak: 0,
                    longest_streak: 0,
                    completion_rate: 0,
                    failed_count: 0,
                    last_check_in_date: null
                }
            };
        })
    );

    return habitsWithStats;
}

// 获取用户完成情况最好的习惯（按连续天数排序）
export async function getTopStreakHabitsFromDB(userId: string, limit: number = 5) {
    return await db.select({
        ...habits,
        total_check_ins: habit_stats.total_check_ins,
        current_streak: habit_stats.current_streak,
        longest_streak: habit_stats.longest_streak,
        completion_rate: habit_stats.completion_rate,
        last_check_in_date: habit_stats.last_check_in_date
    })
        .from(habits)
        .innerJoin(habit_stats, and(
            eq(habits.id, habit_stats.habit_id),
            eq(habit_stats.user_id, userId)
        ))
        .where(eq(habits.user_id, userId))
        .orderBy(desc(habit_stats.current_streak))
        .limit(limit);
}

// 获取用户所有习惯的完成率统计
export async function getHabitCompletionRatesFromDB(userId: string) {
    return await db.select({
        habit_id: habit_stats.habit_id,
        habit_name: habits.name,
        completion_rate: habit_stats.completion_rate
    })
        .from(habit_stats)
        .innerJoin(habits, eq(habit_stats.habit_id, habits.id))
        .where(and(
            eq(habit_stats.user_id, userId),
            eq(habits.user_id, userId)
        ));
}