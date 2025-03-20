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

export async function getHabits() {
  // 获取当前用户ID
  const userId = await getCurrentUserId();
  // 从数据库获取习惯列表
  return getHabitsFromDB(userId);
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
  
  // 将数据保存到数据库
  const newHabit = await createHabitInDB(
    name, 
    description, 
    frequency, 
    userId, 
    { 
      category, 
      rewardPoints 
    }
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

export async function completeHabit(id: string) {
  const userId = await getCurrentUserId();
  // 首先获取当前习惯状态
  const habits = await getHabitsFromDB(userId);
  const habit = habits.find(h => h.id === id);
  
  if (!habit) {
    throw new Error('习惯不存在');
  }
  
  // 切换完成状态
  const newCompletedState = !habit.completedToday;
  await completeHabitInDB(Number(id), newCompletedState, userId);
  
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
