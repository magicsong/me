import { habit_difficulties } from '@/lib/db/schema';
import { eq, and, between, inArray, sql } from 'drizzle-orm';
import { BaseRepository } from '../db/';

// 难度评价数据类型定义
export type HabitDifficultyData = typeof habit_difficulties.$inferSelect;

// 创建输入类型
export type HabitDifficultyCreateInput = Omit<HabitDifficultyData, 'id' | 'created_at'>;

// 更新输入类型
export type HabitDifficultyUpdateInput = Partial<HabitDifficultyData> & { id: number };

/**
 * 习惯难度评价持久化服务
 */
export class HabitDifficultiesPersistenceService extends BaseRepository<typeof habit_difficulties, HabitDifficultyData> {
    constructor(connectionString?: string) {
        super(habit_difficulties);
    }

    /**
     * 根据用户ID查找难度评价
     * @param userId 用户ID
     * @param options 查询选项
     * @returns 难度评价数组
     */
    async findByUserId(userId: string, options?: {
        habitId?: number;
        startDate?: Date;
        endDate?: Date;
    }): Promise<HabitDifficultyData[]> {
        let conditions = eq(habit_difficulties.user_id, userId);

        // 如果提供了习惯ID，筛选特定习惯
        if (options?.habitId) {
            conditions = and(conditions, eq(habit_difficulties.habit_id, options.habitId));
        }

        // 如果提供了日期范围
        if (options?.startDate && options?.endDate) {
            conditions = and(
                conditions,
                between(
                    habit_difficulties.completed_at,
                    options.startDate.toISOString(),
                    options.endDate.toISOString()
                )
            );
        }

        return this.db
            .select()
            .from(habit_difficulties)
            .where(conditions);
    }

    /**
     * 根据习惯ID查找难度评价
     * @param habitId 习惯ID
     * @param userId 用户ID（可选，用于安全校验）
     * @returns 难度评价数组
     */
    async findByHabitId(habitId: number, userId?: string): Promise<HabitDifficultyData[]> {
        let conditions = eq(habit_difficulties.habit_id, habitId);

        // 如果提供了用户ID，确保只返回该用户的评价
        if (userId) {
            conditions = and(conditions, eq(habit_difficulties.user_id, userId));
        }

        return this.db
            .select()
            .from(habit_difficulties)
            .where(conditions);
    }

    /**
     * 创建习惯难度评价
     * @param data 难度评价数据
     * @returns 创建的难度评价
     */
    async createDifficultyRating(data: HabitDifficultyCreateInput): Promise<HabitDifficultyData> {
        return this.create(data);
    }

    /**
     * 根据习惯ID和日期范围查找难度评价
     * @param habitId 习惯ID
     * @param startDate 开始日期
     * @param endDate 结束日期
     * @param userId 用户ID（可选）
     * @returns 难度评价数组
     */
    async findByHabitAndDate(
        habitId: number,
        startDate: Date,
        endDate: Date,
        userId?: string
    ): Promise<HabitDifficultyData[]> {
        let conditions = and(
            eq(habit_difficulties.habit_id, habitId),
            between(
                habit_difficulties.completed_at,
                startDate.toISOString(),
                endDate.toISOString()
            )
        );

        // 如果提供了用户ID，确保只返回该用户的评价
        if (userId) {
            conditions = and(conditions, eq(habit_difficulties.user_id, userId));
        }

        return this.db
            .select()
            .from(habit_difficulties)
            .where(conditions);
    }

    /**
     * 获取习惯的平均难度
     * @param habitId 习惯ID
     * @param userId 用户ID（可选）
     * @returns 包含平均难度的对象，如果没有评价则返回null
     */
    async getAverageDifficulty(habitId: number, userId?: string): Promise<{ 
        averageDifficulty: string;
        easyCount: number;
        mediumCount: number;
        hardCount: number;
        totalCount: number;
    } | null> {
        let conditions = eq(habit_difficulties.habit_id, habitId);

        // 如果提供了用户ID，确保只计算该用户的评价
        if (userId) {
            conditions = and(conditions, eq(habit_difficulties.user_id, userId));
        }

        const result = await this.db
            .select({
                easyCount: sql`SUM(CASE WHEN difficulty = 'easy' THEN 1 ELSE 0 END)`,
                mediumCount: sql`SUM(CASE WHEN difficulty = 'medium' THEN 1 ELSE 0 END)`,
                hardCount: sql`SUM(CASE WHEN difficulty = 'hard' THEN 1 ELSE 0 END)`,
                totalCount: sql`COUNT(*)`,
            })
            .from(habit_difficulties)
            .where(conditions)
            .execute();
        
        if (result.length === 0 || result[0].totalCount === 0) {
            return null;
        }

        const { easyCount, mediumCount, hardCount, totalCount } = result[0];
        
        // 计算平均难度
        // 给每个难度级别分配权重：easy=1, medium=2, hard=3
        const weightedSum = easyCount * 1 + mediumCount * 2 + hardCount * 3;
        const averageValue = weightedSum / totalCount;
        
        // 根据平均值确定难度级别
        let averageDifficulty = 'medium';
        if (averageValue < 1.67) {
            averageDifficulty = 'easy';
        } else if (averageValue > 2.33) {
            averageDifficulty = 'hard';
        }

        return {
            averageDifficulty,
            easyCount,
            mediumCount,
            hardCount,
            totalCount
        };
    }

    /**
     * 批量获取习惯难度评价
     * @param habitIds 习惯ID数组
     * @param userId 用户ID（可选）
     * @returns 难度评价数组
     */
    async findByHabitIds(habitIds: number[], userId?: string): Promise<HabitDifficultyData[]> {
        let conditions = inArray(habit_difficulties.habit_id, habitIds);

        // 如果提供了用户ID，确保只返回该用户的评价
        if (userId) {
            conditions = and(conditions, eq(habit_difficulties.user_id, userId));
        }

        return this.db
            .select()
            .from(habit_difficulties)
            .where(conditions);
    }

    /**
     * 根据ID获取难度评价
     * @param id 评价ID
     * @param userId 用户ID（用于安全校验）
     * @returns 难度评价对象或null
     */
    async findById(id: number, userId?: string): Promise<HabitDifficultyData | null> {
        let conditions = eq(habit_difficulties.id, id);

        // 如果提供了用户ID，确保只返回该用户的评价
        if (userId) {
            conditions = and(conditions, eq(habit_difficulties.user_id, userId));
        }

        const results = await this.db
            .select()
            .from(habit_difficulties)
            .where(conditions);
        
        return results.length > 0 ? results[0] : null;
    }
}
