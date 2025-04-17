import { PersistenceService, PromptBuilder, OutputParser } from '@/app/api/lib/types';
import { frequency, habits, status, habit_entries } from '@/lib/db/schema';
import { eq, desc, sql, and } from 'drizzle-orm';
import { db } from '../db';
import { format } from 'date-fns';

// 习惯类型定义
export type Habit = typeof habits.$inferInsert

// 习惯创建输入类型
export type HabitCreateInput = Omit<Habit, 'id' | 'created_at'>;

// 习惯更新输入类型
export type HabitUpdateInput = Partial<Habit> & { id: number };

/**
 * 习惯持久化服务
 */
export class HabitPersistenceService implements PersistenceService<Habit> {
  private db;

  constructor(connectionString?: string) {
    this.db = db;
  }

  // 创建单个习惯
  async create(data: Partial<Habit>): Promise<Habit> {
    const [created] = await this.db.insert(habits).values({
      name: data.name!,
      description: data.description,
      frequency: data.frequency as any || 'daily',
      user_id: data.user_id!,
      category: data.category,
      reward_points: data.reward_points || 1,
      status: data.status as any || 'active'
    }).returning();

    return created as Habit;
  }

  // 创建多个习惯
  async createMany(data: Partial<Habit>[]): Promise<Habit[]> {
    const values = data.map(item => ({
      name: item.name!,
      description: item.description,
      frequency: item.frequency as any || 'daily',
      user_id: item.user_id!,
      category: item.category,
      reward_points: item.reward_points || 1,
      status: item.status as any || 'active'
    }));

    const created = await this.db.insert(habits).values(values).returning();
    return created as Habit[];
  }

  // 获取单个习惯
  async get(id: string | number): Promise<Habit | null> {
    const [result] = await this.db.select().from(habits).where(eq(habits.id, Number(id)));
    return result as Habit || null;
  }

  // 获取用户所有习惯
  async getAll(userId: string): Promise<Habit[]> {
    const results = await this.db
      .select()
      .from(habits)
      .where(eq(habits.user_id, userId))
      .orderBy(desc(habits.created_at));
    
    return results as Habit[];
  }

  // 获取用户所有习惯，并包含今日打卡状态
  async getAllWithTodayCheckIns(userId: string): Promise<Habit[]> {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // 首先获取所有习惯
    const userHabits = await this.db
      .select()
      .from(habits)
      .where(eq(habits.user_id, userId))
      .orderBy(desc(habits.created_at));

    // 然后获取今天的所有打卡记录
    const todayEntries = await this.db
      .select()
      .from(habit_entries)
      .where(
        and(
          eq(habit_entries.user_id, userId),
          sql`DATE(${habit_entries.completed_at}) = ${today}`
        )
      );

    // 创建一个打卡记录的查找映射
    const todayCheckInMap = new Map();
    todayEntries.forEach(entry => {
      todayCheckInMap.set(entry.habit_id, true);
    });

    // 为每个习惯添加打卡状态
    const habitsWithCheckIns = userHabits.map(habit => {
      return {
        ...habit,
        todayCheckedIn: todayCheckInMap.has(habit.id)
      };
    });
    
    return habitsWithCheckIns as Habit[];
  }

  // 更新习惯
  async update(id: string | number, data: Partial<Habit>): Promise<Habit> {
    const [updated] = await this.db
      .update(habits)
      .set({
        name: data.name,
        description: data.description,
        frequency: data.frequency as any,
        category: data.category,
        reward_points: data.reward_points,
        status: data.status as any
      })
      .where(eq(habits.id, Number(id)))
      .returning();
    
    return updated as Habit;
  }

  // 批量更新习惯
  async updateMany(updates: { id: string | number; data: Partial<Habit> }[]): Promise<Habit[]> {
    const results: Habit[] = [];
    
    // 由于Drizzle ORM不直接支持批量更新，我们需要逐个处理
    for (const update of updates) {
      const updated = await this.update(update.id, update.data);
      results.push(updated);
    }
    
    return results;
  }

  // 删除习惯
  async delete(id: string | number): Promise<boolean> {
    await this.db.delete(habits).where(eq(habits.id, Number(id)));
    return true;
  }
}
