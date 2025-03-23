// 习惯类型定义
export type Habit = {
  id: string;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  createdAt: string;
  completedToday: boolean;
  streak: number;
};

// 难度评估类型定义
export type DifficultyLevel = 'easy' | 'medium' | 'hard' | null;

// 难度历史记录
export type DifficultyHistory = {
  easy: number;
  medium: number;
  hard: number;
  lastFive: DifficultyLevel[];
};
