import { number } from 'zod';
import { BusinessObject } from '../lib/types';

// Todo 业务对象
export interface TodoBO extends BusinessObject {
  id: number;
  userId: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'archived';
  priority: 'urgent' | 'high' | 'medium' | 'low';
  plannedDate?: string;
  plannedStartTime?: string;
  plannedEndTime?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  tagIds?: number[];
  tags: TagBO[];
  pomodoroTimeMinutes?: number;
}

// 批量处理Todo请求
export interface BatchTodoRequest {
  todos: Partial<TodoBO>[];
}


export interface PlanScheduleItem {
  taskId: string;
  title: string;
  startTime: string;
  endTime: string;
  duration: number;
  notes: string;
}

export interface PlanBreak {
  startTime: string;
  endTime: string;
  type: string;
}

export interface PlanUnscheduled {
  taskId: string;
  title: string;
  reason: string;
}

export interface PlanResult {
  schedule: PlanScheduleItem[];
  breaks: PlanBreak[];
  summary: string;
  unscheduled: PlanUnscheduled[];
}

export interface PomodoroBO extends BusinessObject {
  id: number;
  userId: string;
  title: string;
  description?: string;
  duration: number;
  status: 'running' | 'completed' | 'canceled' | 'paused';
  startTime: string;
  endTime?: string;
  todoId?: number;
  habitId?: number;
  goalId?: number;
  createdAt: string;
  tagIds?: number[];
  tags?: Array<TagBO>;
}

export interface TagBO {
  id: number;
  name: string;
  color: string;
  kind?: string;
  userId: string;
}

/**
 * 习惯业务对象类型，一般包含今日数据
 */
export interface HabitBO extends BusinessObject {
  id?: number;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'scenario';
  createdAt?: string;
  userId: string;
  category?: string;
  rewardPoints: number;
  status: 'active' | 'inactive' | 'archived';
  challengeTiers?: ChallengeTierBO[];
  completedToday?: boolean;
  completedTier?: number | null;
  streak: number;
  failedToday?: boolean;
  failureReason?: string;
  checkInDays: number[];
  isPinned: boolean;
  activeTierId?: number;
  stats?: {
    totalCheckIns: number;
    currentStreak: number;
    longestStreak: number;
    completionRate: number | string;
    failedCount: number;
    lastCheckInDate: string | null;
  }
}

export interface ChallengeTierBO extends BusinessObject {
  id: number;
  name: string;
  level: number;
  description?: string;
  reward_points: number;
}


/**
 * 日常总结数据的基本结构
 */
export interface BaseSummaryItem {
  date: string;
  completedTasks: string[];
  failedTasks: string[]; // 添加字段
  completionCount: number;
  completionScore: number;
  goodThings: string[];
  learnings: string[]; // 修改为数组类型
  challenges: string[]; // 修改为数组类型
  improvements: string[]; // 修改为数组类型
  mood: string;
  energyLevel: string;
  sleepQuality: string;
  tomorrowGoals: string;
  aiSummary?: string;
  failedHabits: string[];
  completedHabits: string[];
}

/**
 * 每日总结的上下文接口
 */
export interface DailySummaryContext extends BaseSummaryItem {

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

// 定义笔记业务对象
export interface NoteBO extends BusinessObject {
  id?: number;
  userId: string;
  title: string;
  content: string;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
  tags?: Array<TagBO>;
}