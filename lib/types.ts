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

/**
 * 基础请求接口
 */
export interface BaseRequest<T> {
  data: T | T[]; // 单条或批量数据
  autoGenerate?: boolean; // 是否需要LLM自动生成
  batchSize?: number; // 自动生成时的批量大小
}

/**
 * 基础响应接口
 */
export interface BaseResponse<T> {
  success: boolean;
  data?: T | T[];
  error?: string;
  generatedCount?: number;
}

/**
 * LLM服务接口
 */
export interface LLMService {
  generateContent(prompt: string): Promise<string>;
}

/**
 * 持久化服务接口
 */
export interface PersistenceService<T> {
  create(data: T): Promise<T>;
  createMany(data: T[]): Promise<T[]>;
  update(id: string, data: Partial<T>): Promise<T>;
  updateMany(items: Array<{id: string, data: Partial<T>}>): Promise<T[]>;
}

/**
 * 提示构建器接口
 */
export interface PromptBuilder<T> {
  buildCreatePrompt(partialData?: Partial<T>): string;
  buildUpdatePrompt(existingData: T, partialData: Partial<T>): string;
}

/**
 * 输出解析器接口
 */
export interface OutputParser<T> {
  parseCreateOutput(output: string): T;
  parseUpdateOutput(output: string, existingData: T): T;
}