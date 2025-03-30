'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth'; // 导入auth函数
import {
  getHabitsFromDB,
  createHabitInDB,
  deleteHabitFromDB,
  completeHabitInDB,
  getHabitHistoryFromDB,
  getHabitStatsFromDB,
  updateHabitInDB,
  saveHabitDifficultyInDB,  // 添加此导入
  getHabitDifficultyHistoryFromDB,  // 添加此导入
  completeHabitOnDateInDB, // 添加此导入用于补打卡
} from '@/lib/db';
// 从新文件导入奖励相关函数
import {
  getUserRewardsFromDB,
  updateUserRewardsInDB
} from '@/lib/db-rewards';

// 获取当前用户ID的辅助函数
async function getCurrentUserId() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('未登录或无效用户');
  }
  return session.user.id;
}

export async function getHabits(date?: Date) {
  // 获取当前用户ID
  const userId = await getCurrentUserId();
  return getHabitsFromDB(userId, date);
}

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

export async function deleteHabit(id: string) {
  const userId = await getCurrentUserId();
  // 从数据库删除习惯，传入用户ID确保只能删除自己的习惯
  await deleteHabitFromDB(Number(id), userId);

  revalidatePath('/habits');
  return { success: true };
}

// 定义难度类型
export type DifficultyLevel = 'easy' | 'medium' | 'hard' | null;

// 更新 completeHabit 不再处理难度评估
export async function completeHabit(habitId: string) {
  const userId = await getCurrentUserId();
  // 首先获取当前习惯状态
  const habits = await getHabitsFromDB(userId);
  const habit = habits.find(h => h.id === habitId);

  if (!habit) {
    throw new Error('习惯不存在');
  }

  // 切换完成状态
  const newCompletedState = !habit.completedToday;
  await completeHabitInDB(Number(habitId), newCompletedState, userId);

  // 如果是完成习惯(从未完成到完成)，添加奖励
  if (newCompletedState) {
    const rewardPoints = habit.rewardPoints || 10;
    await updateUserRewardsInDB(userId, rewardPoints, habit.category);
  } else {
    // 如果是取消完成，减去奖励
    const rewardPoints = habit.rewardPoints || 10;
    await updateUserRewardsInDB(userId, -rewardPoints, habit.category);
  }

  revalidatePath('/habits');
  return { success: true };
}

// 新增：单独的难度评价保存函数
export async function saveHabitDifficulty(
  habitId: string,
  difficulty: DifficultyLevel,
  comment?: string
) {
  const userId = await getCurrentUserId();

  if (!difficulty) {
    throw new Error('难度评估不能为空');
  }

  // 保存难度评估到数据库
  await saveHabitDifficultyInDB(
    Number(habitId),
    userId,
    difficulty,
    comment
  );

  revalidatePath('/habits');
  return { success: true };
}

export async function getHabitHistory(id: string) {
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

// 添加更新习惯的函数
export async function updateHabit(id: string, data: {
  name: string;
  description?: string;
  frequency?: 'daily' | 'weekly' | 'monthly';
  category?: string;
  rewardPoints?: number;
}) {
  const userId = await getCurrentUserId();

  // 验证
  if (!data.name) throw new Error('习惯名称不能为空');

  // 确保解构出独立的字段传递给数据库函数
  const { name, description, frequency, category, rewardPoints } = data;

  // 更新数据库 - 分别传递各个字段
  await updateHabitInDB(
    Number(id),
    userId,
    {
      name,
      description,
      frequency,
      category,       // 确保这是一个字符串
      rewardPoints    // 确保这是一个数字
    }
  );

  revalidatePath('/habits');
  return { success: true };
}

// 获取习惯的难度历史
export async function getHabitDifficultyHistory(habitId: string) {
  const userId = await getCurrentUserId();

  // 从数据库获取该习惯的难度评估历史
  return getHabitDifficultyHistoryFromDB(Number(habitId), userId);
}

// 新增：在特定日期补打卡的函数
export async function completeHabitOnDate(habitId: string, date: string) {
  // 检查环境变量是否允许补打卡
  if (process.env.NEXT_PUBLIC_ALLOW_BACKFILL !== 'true') {
    throw new Error('补打卡功能未启用');
  }

  const userId = await getCurrentUserId();

  // 解析日期
  const targetDate = new Date(date);
  // 确保日期有效
  if (isNaN(targetDate.getTime())) {
    throw new Error('无效的日期格式');
  }

  // 获取当前习惯
  const habits = await getHabitsFromDB(userId);
  const habit = habits.find(h => h.id === habitId);

  if (!habit) {
    throw new Error('习惯不存在');
  }

  // 在特定日期完成习惯
  await completeHabitOnDateInDB(Number(habitId), userId, targetDate);

  // 添加奖励
  const rewardPoints = habit.rewardPoints || 10;
  await updateUserRewardsInDB(userId, rewardPoints, habit.category);

  revalidatePath('/habits');
  return { success: true };
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
