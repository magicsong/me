'use server';

import {
  completeHabitInDB,
  createHabitInDB,
  createHabitTierInDB,
  deleteHabitFromDB,
  deleteHabitTierFromDB,
  getHabitByIdDB, // 添加此导入
  getHabitDifficultyHistoryFromDB,
  getHabitHistoryFromDB,
  getHabitsFromDB,
  getHabitStatsFromDB,
  getHabitTiersFromDB,
  getHabitTierStatsFromDB,
  updateHabitInDB,
  updateHabitTierInDB
} from '@/lib/db/db-habit';
import { revalidatePath } from 'next/cache';
// 从新文件导入奖励相关函数
import {
  getUserRewardsFromDB,
  updateUserRewardsInDB
} from '@/lib/db-rewards';
import { HabitEntry } from '@/lib/persist/habit-entry';
import { getCurrentUserId } from '@/lib/utils';
import { HabitBO } from '@/app/api/types';

export async function createHabit(formData: FormData) {
  const userId = await getCurrentUserId();
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const frequency = formData.get('frequency') as string;
  const category = formData.get('category') as string;
  const rewardPoints = parseInt(formData.get('rewardPoints') as string) || 10;

  // 验证
  if (!name) throw new Error('习惯名称不能为空');

  // 将数据保存到数据库 - 修改参数传递方式，分别传递category和rewardPoints
  const newHabit = await createHabitInDB(
    name,
    description,
    frequency,
    userId,
    category,  // 直接传递category字符串
    rewardPoints  // 直接传递rewardPoints数值
  );

  revalidatePath('/habits');
  return newHabit;
}

export async function deleteHabit(id: number) {
  const userId = await getCurrentUserId();
  // 从数据库删除习惯，传入用户ID确保只能删除自己的习惯
  await deleteHabitFromDB(id, userId);

  revalidatePath('/habits');
  return { success: true };
}

// 定义难度类型
export type DifficultyLevel = 'easy' | 'medium' | 'hard' | null;

export async function getHabitHistory(id: string): Promise<HabitEntry[]> {
  const userId = await getCurrentUserId();
  // 获取特定习惯的历史记录，传入用户ID确保只能查看自己的习惯
  return getHabitHistoryFromDB(Number(id), userId);
}

// 添加获取习惯统计数据的函数
export async function getHabitStats(timeRange?: 'week' | 'month' | 'year') {
  const userId = await getCurrentUserId();
  // 从数据库获取习惯统计数据
  return getHabitStatsFromDB(userId, timeRange);
}

// 获取用户奖励统计数据
export async function getUserRewards() {
  const userId = await getCurrentUserId();
  return getUserRewardsFromDB(userId);
}

// 获取习惯的难度历史
export async function getHabitDifficultyHistory(habitId: number) {
  const userId = await getCurrentUserId();

  // 从数据库获取该习惯的难度评估历史
  return getHabitDifficultyHistoryFromDB(habitId, userId);
}

// 获取指定日期的习惯列表
export async function getHabitsForDate(dateString?: string) {
  const userId = await getCurrentUserId();

  // 如果提供了日期字符串，则转换为日期对象
  let targetDate: Date | undefined = undefined;
  if (dateString) {
    targetDate = new Date(dateString);
    // 验证日期是否有效
    if (isNaN(targetDate.getTime())) {
      throw new Error('无效的日期格式');
    }
  }

  // 从数据库获取习惯列表，可能为特定日期
  return getHabitsFromDB(userId, targetDate);
}

// ===== 新增习惯挑战相关函数 =====

// 获取习惯的挑战阶梯
export async function getHabitTiers(habitId: number) {
  const userId = await getCurrentUserId();
  return getHabitTiersFromDB(habitId, userId);
}

// 创建习惯挑战阶梯
export async function createHabitTier(habitId: number, tierData: {
  name: string;
  level: number;
  description?: string;
  reward_points: number;
  completion_criteria?: any;
}) {
  const userId = await getCurrentUserId();

  if (!tierData.name) throw new Error('挑战名称不能为空');
  if (tierData.reward_points < 1) throw new Error('奖励点数不能小于1');

  const result = await createHabitTierInDB(
    Number(habitId),
    userId,
    tierData
  );

  revalidatePath('/habits');
  return result;
}

// 更新习惯挑战阶梯
export async function updateHabitTier(tierId: number, tierData: {
  name?: string;
  level?: number;
  description?: string;
  reward_points?: number;
  completion_criteria?: any;
}) {
  const userId = await getCurrentUserId();

  const result = await updateHabitTierInDB(
    Number(tierId),
    userId,
    tierData
  );

  revalidatePath('/habits');
  return result;
}

// 删除习惯挑战阶梯
export async function deleteHabitTier(tierId: number) {
  const userId = await getCurrentUserId();
  await deleteHabitTierFromDB(Number(tierId), userId);

  revalidatePath('/habits');
  return { success: true };
}

// 获取习惯挑战阶梯统计
export async function getHabitTierStats(habitId: number) {
  const userId = await getCurrentUserId();
  return getHabitTierStatsFromDB(Number(habitId), userId);
}

// 使用特定挑战阶梯完成习惯
export async function completeHabitWithTier(habitId: number, tierId: number) {
  const userId = await getCurrentUserId();

  // 获取当前习惯状态
  const habit = await getHabitByIdDB(habitId, userId);

  if (!habit) {
    throw new Error('习惯不存在');
  }

  // 完成习惯，并指定挑战阶梯
  await completeHabitInDB(habitId, true, userId, tierId);

  // 获取该阶梯的奖励点数
  const tier = habit.challenge_tiers.find(t => t.id === tierId);
  if (!tier) {
    throw new Error('挑战阶梯不存在');
  }

  // 添加奖励
  await updateUserRewardsInDB(userId, tier.reward_points, habit.category);

  revalidatePath('/habits');
  return { success: true };
}
