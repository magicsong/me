'use server';

import { revalidatePath } from 'next/cache';

// 模拟数据，实际项目中应该连接到数据库
let habits = [
  {
    id: '1',
    name: '每天喝水',
    description: '每天至少喝2升水',
    frequency: 'daily',
    createdAt: new Date().toISOString(),
    completedToday: true,
    streak: 5
  },
  {
    id: '2',
    name: '早起',
    description: '每天6点起床',
    frequency: 'daily',
    createdAt: new Date().toISOString(),
    completedToday: false,
    streak: 2
  },
  {
    id: '3',
    name: '阅读',
    description: '每天阅读30分钟',
    frequency: 'daily',
    createdAt: new Date().toISOString(),
    completedToday: false,
    streak: 0
  }
];

export async function getHabits() {
  // 在实际应用中，这里应该从数据库获取习惯
  return habits;
}

export async function createHabit(formData: FormData) {
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const frequency = formData.get('frequency') as string;
  
  // 验证
  if (!name) throw new Error('习惯名称不能为空');
  
  // 在实际应用中，这里应该将数据保存到数据库
  const newHabit = {
    id: Date.now().toString(),
    name,
    description,
    frequency,
    createdAt: new Date().toISOString(),
    completedToday: false,
    streak: 0
  };
  
  habits = [newHabit, ...habits];
  
  revalidatePath('/habits');
  return newHabit;
}

export async function deleteHabit(id: string) {
  // 在实际应用中，这里应该从数据库中删除习惯
  habits = habits.filter(habit => habit.id !== id);
  
  revalidatePath('/habits');
  return { success: true };
}

export async function completeHabit(id: string) {
  // 在实际应用中，这里应该在数据库中更新习惯状态
  habits = habits.map(habit => {
    if (habit.id === id) {
      const wasCompleted = habit.completedToday;
      return {
        ...habit,
        completedToday: !wasCompleted,
        streak: !wasCompleted ? habit.streak + 1 : Math.max(0, habit.streak - 1)
      };
    }
    return habit;
  });
  
  revalidatePath('/habits');
  return { success: true };
}
