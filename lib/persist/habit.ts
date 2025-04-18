import { habit_challenge_tiers, habit_entries, habits } from '@/lib/db/schema';
import { format } from 'date-fns';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { BaseRepository } from '../db/';

// 习惯类型定义
// 习惯数据类型定义
export type HabitData = typeof habits.$inferSelect & {
  challengeTiers?: Array<{
    id: number;
    name: string;
    level: number;
    description?: string;
    reward_points: number;
  }>;
  completedToday?: boolean;
  completedTier?: number | null;
};

// 习惯创建输入类型
export type HabitCreateInput = Omit<HabitData, 'id' | 'created_at'>;

// 习惯更新输入类型
export type HabitUpdateInput = Partial<HabitData> & { id: number };

/**
 * 习惯持久化服务
 */
export class HabitPersistenceService extends BaseRepository<typeof habits, HabitData> {
  constructor(connectionString?: string) {
    super(habits);

    // 设置钩子，在查询后自动加载关联数据
    this.setHooks({
      afterQuery: async (data) => {
        if (!data) return data;

        // 处理单个习惯对象
        if (!Array.isArray(data)) {
          return this.loadAssociatedDataForSingleHabit(data);
        }

        // 处理习惯数组
        return this.loadAssociatedDataForMultipleHabits(data);
      }
    });
  }

  /**
   * 为单个习惯加载关联数据
   */
  private async loadAssociatedDataForSingleHabit(habit: HabitData): Promise<HabitData> {
    // 加载挑战等级
    habit.challengeTiers = await this.getChallengeTiersForHabit(habit.id);
    
    // 检查今日是否已打卡
    const todayCheckIn = await this.getTodayCheckInForHabit(habit.id, habit.user_id);
    habit.completedToday = !!todayCheckIn;
    habit.completedTier = todayCheckIn?.tier_id || null;

    return habit;
  }

  /**
   * 为多个习惯批量加载关联数据
   */
  private async loadAssociatedDataForMultipleHabits(habits: HabitData[]): Promise<HabitData[]> {
    if (habits.length === 0) return habits;

    const habitIds = habits.map(habit => habit.id);
    const userIds = [...new Set(habits.map(habit => habit.user_id))];
    const today = format(new Date(), 'yyyy-MM-dd');

    // 批量获取所有关联的挑战等级
    const allChallengeTiers = await this.db
      .select()
      .from(habit_challenge_tiers)
      .where(inArray(habit_challenge_tiers.habit_id, habitIds));

    // 批量获取所有今日的打卡记录
    const allTodayCheckIns = await this.db
      .select()
      .from(habit_entries)
      .where(
        and(
          inArray(habit_entries.habit_id, habitIds),
          inArray(habit_entries.user_id, userIds),
          sql`DATE(${habit_entries.completed_at}) = ${today}`
        )
      );

    // 为每个习惯分配其对应的关联数据
    return habits.map(habit => {
      const habitChallengeTiers = allChallengeTiers
        .filter(tier => tier.habit_id === habit.id)
        .map(tier => ({
          id: tier.id,
          name: tier.name,
          level: tier.level,
          description: tier.description,
          reward_points: tier.reward_points
        }));

      const todayCheckIn = allTodayCheckIns.find(
        entry => entry.habit_id === habit.id && entry.user_id === habit.user_id
      );

      return {
        ...habit,
        challengeTiers: habitChallengeTiers,
        completedToday: !!todayCheckIn,
        completedTier: todayCheckIn?.tier_id || null
      };
    });
  }

  /**
   * 获取单个习惯的挑战等级
   */
  private async getChallengeTiersForHabit(habitId: number): Promise<Array<{
    id: number;
    name: string;
    level: number;
    description?: string;
    reward_points: number;
  }>> {
    return this.db
      .select({
        id: habit_challenge_tiers.id,
        name: habit_challenge_tiers.name,
        level: habit_challenge_tiers.level,
        description: habit_challenge_tiers.description,
        reward_points: habit_challenge_tiers.reward_points
      })
      .from(habit_challenge_tiers)
      .where(eq(habit_challenge_tiers.habit_id, habitId))
      .orderBy(habit_challenge_tiers.level);
  }

  /**
   * 获取单个习惯的今日打卡记录
   */
  private async getTodayCheckInForHabit(habitId: number, userId: string) {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    const [checkIn] = await this.db
      .select()
      .from(habit_entries)
      .where(
        and(
          eq(habit_entries.habit_id, habitId),
          eq(habit_entries.user_id, userId),
          sql`DATE(${habit_entries.completed_at}) = ${today}`
        )
      );

    return checkIn;
  }

  /**
 * 记录习惯打卡
 * @param habitId 习惯ID
 * @param userId 用户ID
 * @param options 打卡选项
 * @param options.tierId 挑战等级ID
 * @param options.comment 打卡备注
 * @param options.difficulty 完成难度评分
 * @param options.completedAt 指定完成时间，用于补打卡
 */
async checkInHabit(
  habitId: number, 
  userId: string, 
  options?: {
    tierId?: number;
    comment?: string;
    difficulty?: string;
    completedAt?: Date | string;
  }
): Promise<{
  success: boolean;
  habitEntry?: typeof habit_entries.$inferSelect;
}> {
  try {
    const { tierId, comment, difficulty, completedAt } = options || {};
    const checkInDate = completedAt ? new Date(completedAt) : new Date();
    const dateStr = format(checkInDate, 'yyyy-MM-dd');
    
    // 检查指定日期是否已打卡
    const existingCheckIn = await this.db
      .select()
      .from(habit_entries)
      .where(
        and(
          eq(habit_entries.habit_id, habitId),
          eq(habit_entries.user_id, userId),
          sql`DATE(${habit_entries.completed_at}) = ${dateStr}`
        )
      )
      .limit(1);
    
    if (existingCheckIn.length > 0) {
      // 已打卡，返回现有记录
      return {
        success: true,
        habitEntry: existingCheckIn[0]
      };
    }

    // 创建新打卡记录
    const [newEntry] = await this.db.insert(habit_entries).values({
      habit_id: habitId,
      user_id: userId,
      tier_id: tierId,
      comment: comment,
      difficulty: difficulty,
      completed_at: checkInDate.toISOString()
    }).returning();

    return {
      success: true,
      habitEntry: newEntry
    };
  } catch (error) {
    console.error('Failed to check in habit:', error);
    return { success: false };
  }
}

  /**
   * 取消今日打卡
   */
  async cancelCheckInHabit(habitId: number, userId: string): Promise<boolean> {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    try {
      await this.db
        .delete(habit_entries)
        .where(
          and(
            eq(habit_entries.habit_id, habitId),
            eq(habit_entries.user_id, userId),
            sql`DATE(${habit_entries.completed_at}) = ${today}`
          )
        );
      
      return true;
    } catch (error) {
      console.error('Failed to cancel habit check in:', error);
      return false;
    }
  }
  /**
   * 根据频率获取用户习惯
   */
  async getHabitsByFrequency(userId: string, freq: 'daily' | 'weekly' | 'monthly' | 'scenario'): Promise<HabitData[]> {
    return this.findMany({
      user_id: userId,
      frequency: freq
    });
  }
}