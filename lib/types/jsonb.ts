/**
 * Types for journal/diary entries that might be stored in JSONB format
 */

// String literal types for fields with specific values
export type DateType = 'yesterday' | 'today' | 'tomorrow' | 'other';
export type MoodType = '😀' | '😊' | '😐' | '😕' | '😢' | '😡' | string;
export type EnergyLevel = 'high' | 'medium' | 'low';
export type SleepQuality = 'excellent' | 'good' | 'average' | 'poor' | 'terrible';

// Type for completed tasks
export interface Task {
    id: string;
    title: string;
    completed: boolean;
    description?: string;
}

// Main journal entry type
export interface JournalEntry {
    date: string; // Format: 'YYYY-MM-DD'
    mood: MoodType;
    dateType: DateType;
    learnings: string[]; // 修改为数组类型
    challenges: string[]; // 修改为数组类型
    goodThings: string[];
    energyLevel: EnergyLevel;
    improvements: string[]; // 修改为数组类型
    sleepQuality: SleepQuality;
    tomorrowGoals: string;
    completedTasks: string[];
    failedTasks: string[]; // 添加字段
    completionCount: number;
    completionScore: number;
    summary?: string; // 添加字段
    // 1. 时间与专注
    focusTimeMinutes: number;      // 深度工作/专注时长（分钟）
    breakCount: number;            // 中断/休息次数
    distractions: string[];        // 主要打断来源
  
    // 2. 身体与健康
    stepsCount: number;            // 步数
    exerciseMinutes: number;       // 运动时长（分钟）
    waterIntakeMl: number;         // 饮水量（毫升）
    mealsQuality: string;          // 餐饮质量（如：均衡/偏油腻/高蛋白…）
  
    // 3. 压力与恢复
    stressLevel: number;           // 压力感受打分（1–10）
    mindfulnessMinutes: number;    // 正念/冥想时长（分钟）
    selfCareActivities: string[];  // 自我关怀行为（如：泡澡/阅读/听音乐…）
  
    // 4. 习惯与打卡
    habitCompletion: Record<string, boolean>;  
      /* 例如：
        {
          "早起": true,
          "阅读": false,
          "拉伸": true
        }
      */
    
    // 5. 社交与情感
    socialInteractions: string[];  // 主要社交事件（亲友/同事/客户…）
    gratitudeList: string[];       // 感恩清单（3 件当天值得感恩的事）
  
    // 6. 效率与满意度
    productivityRating: number;    // 自评生产力（1–10）
    satisfactionRating: number;    // 对今天整体满意度（1–10）

    // 7. 数字化进度
    goalProgress: Record<string, number>;  
      /* 比如：
        {
          "写技术文档": 0.6,    // 60%
          "练习吉他": 0.2
        }
      */
}

// Helper type for partial journal entries
export type PartialJournalEntry = Partial<JournalEntry>;