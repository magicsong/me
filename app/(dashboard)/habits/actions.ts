'use server';

import { revalidatePath } from 'next/cache';
import { 
  getHabitsFromDB, 
  createHabitInDB,
  deleteHabitFromDB,
  completeHabitInDB
} from '@/lib/db';

export async function getHabits() {
  // 从数据库获取习惯列表
  return getHabitsFromDB();
}

export async function createHabit(formData: FormData) {
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const frequency = formData.get('frequency') as string;
  
  // 验证
  if (!name) throw new Error('习惯名称不能为空');
  
  // 将数据保存到数据库
  const newHabit = await createHabitInDB(name, description, frequency);
  
  revalidatePath('/habits');
  return newHabit;
}

export async function deleteHabit(id: string) {
  // 从数据库删除习惯
  await deleteHabitFromDB(Number(id));
  
  revalidatePath('/habits');
  return { success: true };
}

export async function completeHabit(id: string) {
  // 首先获取当前习惯状态
  const habits = await getHabitsFromDB();
  const habit = habits.find(h => h.id === id);
  
  if (!habit) {
    throw new Error('习惯不存在');
  }
  
  // 切换完成状态
  const newCompletedState = !habit.completedToday;
  await completeHabitInDB(Number(id), newCompletedState);
  
  revalidatePath('/habits');
  return { success: true };
}
