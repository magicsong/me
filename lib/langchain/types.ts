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
}

/**
 * 每日总结的上下文接口
 */
export interface DailySummaryContext {
  date: string;
  completedTasks: string[];
  completedTodos: string[];
  failedTasks: string[];
  goodThings: string[];
  learnings: string;
  challenges: string;
  improvements: string;
  mood: string;
  energyLevel: string;
  sleepQuality: string;
  tomorrowGoals: string;

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
  highlight: string;             // 今日亮点
  regret: string;                // 今日遗憾

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
 * 操作类型枚举
 */
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  READ = 'read'
}

/**
 * 实体类型枚举
 */
export enum EntityType {
  TODO_ITEM = 'todo_item',
  HABIT = 'habit',
  NOTE = 'note',
  JOURNAL = 'journal',
  // 其他实体类型...
}

/**
 * 单个操作定义
 */
export interface Operation<T = any> {
  type: OperationType;
  data: T;
}

/**
 * 批量操作定义
 */
export interface BatchOperation<T = any> {
  type: OperationType;
  items: T[];
}

/**
 * LLM生成选项
 */
export interface LLMGenerationOptions {
  autoGenerate: boolean;
  temperature?: number;
  creativity?: 'low' | 'medium' | 'high';
  customInstructions?: string;
}

/**
 * API响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  error?: string;
}

/**
 * 批量API响应格式
 */
export interface BatchApiResponse<T = any> {
  success: boolean;
  data?: T[];
  message: string;
  error?: string;
  errors?: { index: number; message: string }[];
}
