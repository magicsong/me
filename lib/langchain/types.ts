/**
 * 日常总结数据的基本结构
 */
export interface BaseSummaryItem {
  date: string;
  completedTasks: string[];
  failedTasks: string[];
  completionCount: number;
  completionScore: number;
  goodThings: string[];
  learnings: string;
  challenges: string;
  improvements: string;
  mood: string;
  energyLevel: string;
  sleepQuality: string;
  tomorrowGoals: string;
  aiSummary?: string;
}

/**
 * 每日总结的上下文接口
 */
export interface DailySummaryContext {
  date: string;
  completedTasks: string[];
  failedTasks: string[];
  goodThings: string[];
  learnings: string;
  challenges: string;
  improvements: string;
  mood: string;
  energyLevel: string;
  sleepQuality: string;
  tomorrowGoals: string;
}

/**
 * 最近三天总结的上下文接口
 */
export interface ThreeDaySummaryContext {
  dailySummaries: BaseSummaryItem[];
  startDate: string;
  endDate: string;
}

/**
 * 每周总结的上下文接口
 */
export interface WeeklySummaryContext {
  startDate: string;
  endDate: string;
  completedTasks: string[];
  goodThings: string[];
  learnings: string[];
  challenges: string[];
  improvements: string[];
  mood: string[];
  energyLevel: string[];
  sleepQuality: string[];
  nextWeekGoals: string[];
  // 新增字段
  habitCompletionRates: Record<string, number>; // 各项习惯的完成率，例如 {"阅读": 0.8, "锻炼": 0.6}
  weeklyGoals: string[]; // 本周设定的目标
  weeklyGoalsCompletion: Record<string, boolean>; // 本周目标的完成情况
  weaknesses: string[]; // 详细的不足描述
}

/**
 * 总结类型枚举
 */
export enum SummaryType {
  DAILY = 'daily',
  THREE_DAY = 'three_day',
  WEEKLY = 'weekly'
}
