  
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
