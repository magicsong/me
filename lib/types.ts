// 目标相关类型定义
export type GoalType = 'annual' | 'quarterly' | 'monthly' | 'custom';
export type GoalStatus = 'in_progress' | 'completed' | 'failed';

export interface HabitTarget {
  habitId: string;
  targetCompletionRate: number; // 0-100 百分比
  currentCompletionRate?: number; // 当前完成率
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  type: GoalType;
  startDate: string;
  endDate: string;
  habitTargets: HabitTarget[];
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}