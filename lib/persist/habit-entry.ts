import { habit_entries, habits, habit_challenge_tiers } from '@/lib/db/schema';
import { eq, and, desc, gte, sql, count, between } from 'drizzle-orm';
import { db } from '../db';
import { subDays, format, parseISO } from 'date-fns';

// 打卡记录类型定义
export type HabitEntry = typeof habit_entries.$inferInsert & {
  comment?: string; // 打卡评论
}

// 打卡统计结果
export interface HabitCheckInStats {
  totalCheckIns: number;
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
  lastCheckInDate?: string;
  checkInsByDate: Record<string, HabitEntry[]>;
}

/**
 * 习惯打卡持久化服务
 */
export class HabitEntryService {
  private db;

  constructor() {
    this.db = db;
  }

  // 创建打卡记录
  async create(data: Partial<HabitEntry>): Promise<HabitEntry> {
    // 检查是否已经打卡
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    const existingEntries = await this.db
      .select()
      .from(habit_entries)
      .where(
        and(
          eq(habit_entries.habit_id, data.habit_id!),
          eq(habit_entries.user_id, data.user_id!),
          sql`DATE(${habit_entries.completed_at}) = ${todayStr}`
        )
      );
      
    if (existingEntries.length > 0) {
      throw new Error('今天已经打卡过了');
    }
    
    const [created] = await this.db.insert(habit_entries).values({
      habit_id: data.habit_id!,
      user_id: data.user_id!,
      completed_at: data.completed_at || new Date().toISOString(),
      tier_id: data.tier_id,
      comment: data.comment,
    }).returning();

    return created as HabitEntry;
  }

  // 取消打卡（删除今天的打卡记录）
  async cancelTodayCheckIn(habitId: number, userId: string): Promise<boolean> {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    await this.db
      .delete(habit_entries)
      .where(
        and(
          eq(habit_entries.habit_id, habitId),
          eq(habit_entries.user_id, userId),
          sql`DATE(${habit_entries.completed_at}) = ${todayStr}`
        )
      );
      
    return true;
  }

  // 获取习惯的所有打卡记录
  async getEntriesByHabitId(habitId: number, userId: string): Promise<HabitEntry[]> {
    const entries = await this.db
      .select()
      .from(habit_entries)
      .where(
        and(
          eq(habit_entries.habit_id, habitId),
          eq(habit_entries.user_id, userId)
        )
      )
      .orderBy(desc(habit_entries.completed_at));
      
    return entries as HabitEntry[];
  }

  // 获取指定日期范围内的打卡记录
  async getEntriesInDateRange(
    habitId: number, 
    userId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<HabitEntry[]> {
    const entries = await this.db
      .select()
      .from(habit_entries)
      .where(
        and(
          eq(habit_entries.habit_id, habitId),
          eq(habit_entries.user_id, userId),
          between(habit_entries.completed_at, startDate.toISOString(), endDate.toISOString())
        )
      )
      .orderBy(desc(habit_entries.completed_at));
      
    return entries as HabitEntry[];
  }
  
  // 获取用户今天的所有打卡记录
  async getTodayEntries(userId: string): Promise<HabitEntry[]> {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    const entries = await this.db
      .select({
        ...habit_entries,
        habit_name: habits.name,
        tier_name: habit_challenge_tiers.name,
        tier_level: habit_challenge_tiers.level,
      })
      .from(habit_entries)
      .leftJoin(habits, eq(habit_entries.habit_id, habits.id))
      .leftJoin(habit_challenge_tiers, eq(habit_entries.tier_id, habit_challenge_tiers.id))
      .where(
        and(
          eq(habit_entries.user_id, userId),
          sql`DATE(${habit_entries.completed_at}) = ${todayStr}`
        )
      );
      
    return entries as unknown as HabitEntry[];
  }

  // 检查今天是否已经打卡
  async hasCheckedInToday(habitId: number, userId: string): Promise<boolean> {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    const [result] = await this.db
      .select({ count: count() })
      .from(habit_entries)
      .where(
        and(
          eq(habit_entries.habit_id, habitId),
          eq(habit_entries.user_id, userId),
          sql`DATE(${habit_entries.completed_at}) = ${todayStr}`
        )
      );
      
    return result.count > 0;
  }

  // 计算打卡统计数据
  async getCheckInStats(habitId: number, userId: string): Promise<HabitCheckInStats> {
    // 获取所有打卡记录
    const entries = await this.getEntriesByHabitId(habitId, userId);
    
    // 按日期分组（去重）
    const checkInsByDate: Record<string, HabitEntry[]> = {};
    
    entries.forEach(entry => {
      const dateStr = format(new Date(entry.completed_at), 'yyyy-MM-dd');
      if (!checkInsByDate[dateStr]) {
        checkInsByDate[dateStr] = [];
      }
      checkInsByDate[dateStr].push(entry);
    });
    
    const uniqueDates = Object.keys(checkInsByDate).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );
    
    // 总打卡次数
    const totalCheckIns = uniqueDates.length;
    
    // 计算当前连续打卡天数
    let currentStreak = 0;
    let currentDate = new Date();
    
    while (true) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      if (checkInsByDate[dateStr]) {
        currentStreak++;
        currentDate = subDays(currentDate, 1);
      } else {
        break;
      }
    }
    
    // 计算最长连续打卡天数
    let longestStreak = 0;
    let currentStreakCount = 0;
    let previousDate: Date | null = null;
    
    uniqueDates.reverse().forEach(dateStr => {
      const currentDate = new Date(dateStr);
      
      if (previousDate === null) {
        currentStreakCount = 1;
      } else {
        const diffDays = Math.floor((previousDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          currentStreakCount++;
        } else {
          currentStreakCount = 1;
        }
      }
      
      if (currentStreakCount > longestStreak) {
        longestStreak = currentStreakCount;
      }
      
      previousDate = currentDate;
    });
    
    // 计算完成率（最近30天）
    const thirtyDaysAgo = subDays(new Date(), 30);
    const daysInPeriod = 30;
    
    const checkInsInLast30Days = uniqueDates.filter(date => 
      new Date(date) >= thirtyDaysAgo
    ).length;
    
    const completionRate = (checkInsInLast30Days / daysInPeriod) * 100;
    
    return {
      totalCheckIns,
      currentStreak,
      longestStreak,
      completionRate,
      lastCheckInDate: uniqueDates[0],
      checkInsByDate,
    };
  }

  // 实现接口所需的方法
  async get(id: string | number): Promise<HabitEntry | null> {
    const [result] = await this.db
      .select()
      .from(habit_entries)
      .where(eq(habit_entries.id, Number(id)));
      
    return result as HabitEntry || null;
  }
  
  async getAll(userId: string): Promise<HabitEntry[]> {
    const entries = await this.db
      .select()
      .from(habit_entries)
      .where(eq(habit_entries.user_id, userId))
      .orderBy(desc(habit_entries.completed_at));
      
    return entries as HabitEntry[];
  }
  
  async update(id: string | number, data: Partial<HabitEntry>): Promise<HabitEntry> {
    const [updated] = await this.db
      .update(habit_entries)
      .set({
        tier_id: data.tier_id,
        comment: data.comment,
      })
      .where(eq(habit_entries.id, Number(id)))
      .returning();
      
    return updated as HabitEntry;
  }
  
  async delete(id: string | number): Promise<boolean> {
    await this.db
      .delete(habit_entries)
      .where(eq(habit_entries.id, Number(id)));
      
    return true;
  }
  
  // 获取习惯的挑战阶梯列表
  async getHabitTiers(habitId: number): Promise<typeof habit_challenge_tiers.$inferSelect[]> {
    const tiers = await this.db
      .select()
      .from(habit_challenge_tiers)
      .where(eq(habit_challenge_tiers.habit_id, habitId))
      .orderBy(habit_challenge_tiers.level);
      
    return tiers;
  }
}
