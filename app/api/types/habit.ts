// 导入类型定义
export type Habit = {
    id: number;
    name: string;
    description?: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    createdAt: string;
    completedToday: boolean;
    streak: number;
    challenge_tiers?: ChallengeTier[];
    completed_tier?: CompletedTier | null;
  };
  
  // 挑战阶梯类型
  export type ChallengeTier = {
    id: number;
    name: string;
    level: number;
    description?: string;
    reward_points: number;
  };
  
  // 完成的挑战阶梯类型
  export type CompletedTier = {
    id: number;
    name: string;
    level: number;
    reward_points: number;
  };
