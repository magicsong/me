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
