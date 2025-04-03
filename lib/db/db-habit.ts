
import { habits } from "@/iac/drizzle/schema";
import { and, desc, eq, sql } from 'drizzle-orm';
import {
    date,
    integer,
    pgEnum,
    pgTable,
    serial,
    text,
    timestamp
} from 'drizzle-orm/pg-core';
import { db } from './pool';

// todo: remove this
export const habitEntries = pgTable('habit_entries', {
    id: serial('id').primaryKey(),
    habitId: integer('habit_id').references(() => habits.id).notNull(),
    completedAt: date('completed_at').defaultNow().notNull(),
    userId: text('user_id')  // 如果系统支持多用户，这里可以关联到用户表
});

// 难度级别枚举
export const difficultyEnum = pgEnum('difficulty', ['easy', 'medium', 'hard']);

// 习惯难度评价表
export const habitDifficulties = pgTable('habit_difficulties', {
  id: serial('id').primaryKey(),
  habitId: integer('habit_id').references(() => habits.id).notNull(),
  userId: text('user_id').notNull(),
  completedAt: date('completed_at').defaultNow().notNull(),
  difficulty: difficultyEnum('difficulty').notNull(),
  comment: text('comment'), // 文本评价
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export async function getHabitByIdDB(id: number, userId: string) {
    const habit = await db.select().from(habits).where(and(eq(habits.id, id), eq(habits.user_id, userId))).limit(1);
    return habit.length > 0 ? habit[0] : null;
}

// 习惯相关的数据库函数
export async function getHabitsFromDB(userId: string, targetDate?: Date) {
    const allHabits = await db.select().from(habits)
        .where(eq(habits.user_id, userId))
        .orderBy(desc(habits.created_at));

    // 获取目标日期，如果没提供就用今天
    const checkDate = targetDate || new Date();
    checkDate.setHours(0, 0, 0, 0); // 设置为当天的开始时间

    // 为每个习惯获取完成记录
    const habitsWithProgress = await Promise.all(
        allHabits.map(async (habit) => {
            // 检查目标日期是否已完成
            const dateEntry = await db
                .select()
                .from(habitEntries)
                .where(
                    and(
                        eq(habitEntries.habitId, habit.id),
                        eq(habitEntries.completedAt, checkDate),
                        eq(habitEntries.userId, userId)
                    )
                )
                .limit(1);

            // 计算连续完成天数 (streak)
            const entries = await db
                .select()
                .from(habitEntries)
                .where(
                    and(
                        eq(habitEntries.habitId, habit.id),
                        eq(habitEntries.userId, userId)
                    )
                )
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
                createdAt: habit.created_at,
                completedToday: dateEntry.length > 0,
                category: habit.category,
                rewardPoints: habit.reward_points,
                streak: streak
            };
        })
    );

    return habitsWithProgress;
}

export async function createHabitInDB(name: string, description: string, frequency: string, userId: string, category: string, rewardPoints: number) {
    const result = await db.insert(habits).values({
        name,
        description: description || null,
        frequency: frequency as 'daily' | 'weekly' | 'monthly',
        userId,
        category: category || null,
        rewardPoints: rewardPoints || 1
    }).returning();

    return result[0];
}

export async function deleteHabitFromDB(id: number, userId: string) {
    // 首先删除所有关联的完成记录
    await db.delete(habitEntries).where(
        and(
            eq(habitEntries.habitId, id),
            eq(habitEntries.userId, userId)
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

export async function completeHabitInDB(id: number, completed: boolean, userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 设置为今天的开始时间

    // 检查今天是否已有记录
    const existingEntry = await db
        .select()
        .from(habitEntries)
        .where(
            and(
                eq(habitEntries.habitId, id),
                eq(habitEntries.completedAt, today),
                eq(habitEntries.userId, userId)
            )
        )
        .limit(1);

    // 如果需要标记为完成且没有现有记录，则添加新记录
    if (completed && existingEntry.length === 0) {
        await db.insert(habitEntries).values({
            habitId: id,
            completedAt: today,
            userId
        });
        return true;
    }

    // 如果需要标记为未完成且有记录，则删除记录
    if (!completed && existingEntry.length > 0) {
        await db.delete(habitEntries).where(
            and(
                eq(habitEntries.habitId, id),
                eq(habitEntries.completedAt, today),
                eq(habitEntries.userId, userId)
            )
        );
        return false;
    }

    // 返回当前状态
    return existingEntry.length > 0;
}

// 在特定日期完成习惯
export async function completeHabitOnDateInDB(habitId: number, userId: string, targetDate: Date) {
    // 将日期设置为当天的开始时间（0点0分0秒）
    const normalizedDate = new Date(targetDate);
    normalizedDate.setHours(0, 0, 0, 0);

    // 检查指定日期是否已有记录
    const existingEntry = await db
        .select()
        .from(habitEntries)
        .where(
            and(
                eq(habitEntries.habitId, habitId),
                eq(habitEntries.completedAt, normalizedDate),
                eq(habitEntries.userId, userId)
            )
        )
        .limit(1);

    // 如果已存在记录，直接返回（避免重复记录）
    if (existingEntry.length > 0) {
        return existingEntry[0].id;
    }

    // 检查日期是否在未来
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (normalizedDate > today) {
        throw new Error('不能在未来日期补打卡');
    }

    // 添加补打卡记录
    const result = await db.insert(habitEntries).values({
        habitId,
        completedAt: normalizedDate,
        userId
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
export async function getHabitHistoryFromDB(habitId: number, userId: string): Promise<HabitHistoryEntry[]> {
    // 使用JOIN查询同时获取完成记录和难度评价
    const entries = await db
        .select({
            completedAt: habitEntries.completedAt,
            difficulty: habitDifficulties.difficulty,
            comment: habitDifficulties.comment
        })
        .from(habitEntries)
        .leftJoin(
            habitDifficulties,
            and(
                eq(habitEntries.habitId, habitDifficulties.habitId),
                eq(habitEntries.userId, habitDifficulties.userId),
                eq(habitEntries.completedAt, habitDifficulties.completedAt)
            )
        )
        .where(
            and(
                eq(habitEntries.habitId, habitId),
                eq(habitEntries.userId, userId)
            )
        )
        .orderBy(desc(habitEntries.completedAt))
        .limit(30); // 限制返回最多30条记录

    // 将查询结果转换为前端需要的格式
    return entries.map(entry => ({
        date: new Date(entry.completedAt),
        completed: true,
        difficulty: entry.difficulty || null,
        comment: entry.comment || null
    }));
}

export async function updateHabitInDB(id: number, userId: string, data: {
    name: string;
    description?: string;
    frequency?: 'daily' | 'weekly' | 'monthly';
    category?: string;
    rewardPoints?: number;
}) {
    const { name, description, frequency, category, rewardPoints } = data;

    await db.update(habits).set({
        name,
        description,
        frequency,
        category,
        reward_points: rewardPoints
    }).where(
        and(
            eq(habits.id, id),
            eq(habits.user_id, userId)
        )
    );
}
// 获取习惯统计数据
export async function getHabitStatsFromDB(userId: string, timeRange: 'week' | 'month' | 'year' = 'week') {
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

    // 获取所有习惯，只获取该用户的习惯
    const allHabits = await db.select().from(habits)
        .where(eq(habits.user_id, userId));

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

    // 获取日期范围内的所有完成记录，只获取该用户的记录
    const entries = await db
        .select()
        .from(habitEntries)
        .where(
            and(
                sql`${habitEntries.completedAt} >= ${startDate} AND ${habitEntries.completedAt} <= ${today}`,
                eq(habitEntries.userId, userId)
            )
        )
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
            .where(
                and(
                    eq(habitEntries.habitId, id),
                    eq(habitEntries.userId, userId)
                )
            )
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
                eq(habitDifficulties.habitId, habitId),
                eq(habitDifficulties.userId, userId),
                eq(habitDifficulties.completedAt, today)
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
                    eq(habitDifficulties.habitId, habitId),
                    eq(habitDifficulties.userId, userId),
                    eq(habitDifficulties.completedAt, today)
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
                eq(habitDifficulties.habitId, habitId),
                eq(habitDifficulties.userId, userId)
            )
        )
        .orderBy(desc(habitDifficulties.completedAt))
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