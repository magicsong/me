import { PromptTemplate } from "@langchain/core/prompts";

/**
 * 基础请求接口 - 处理单个对象
 */
export interface BaseRequest<T> {
  data?: T; // 单条数据 - 不再支持数组
  autoGenerate?: boolean; // 是否需要LLM自动生成
  batchSize?: number; // 自动生成时的批量大小
  userPrompt?: string; // 用户给大模型的提示
  userId?: string; // 可选: 用户ID限制，确保只操作该用户的资源
}

/**
 * 批量请求基础接口 - 专门处理批量操作
 */
export interface BaseBatchRequest<T> {
  data: T[]; // 批量数据 - 必须是数组
  autoGenerate?: boolean; // 是否需要LLM自动生成
  batchSize?: number; // 自动生成时的批量大小
  userPrompt?: string; // 用户给大模型的提示
  generateBothCreatedAndUpdated?: boolean; // 是否需要同时生成新建和更新的对象，如果是，必须传入data
  userId?: string; // 可选: 用户ID限制，确保只操作该用户的资源
}

/**
 * Patch 请求接口 - 用于精确更新指定字段
 */
export interface PatchRequest<T> {
  id: string | number;            // 必需: 要更新的资源ID
  userId?: string;                // 可选: 用户ID限制，确保只更新该用户的资源
  fields: Partial<T>;             // 要更新的字段集合
}

// BatchPatchRequest 会统一更新所有对象的某个字段，比如置为成功无效等等
export interface BatchPatchRequest<T> {
  id: string[] | number[];            // 必需: 要更新的资源ID
  userId?: string;                // 可选: 用户ID限制，确保只更新该用户的资源
  fields: Partial<T>;             // 要更新的字段集合
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
 * 通用过滤器类型，支持基本操作符
 */
export type FilterOperator =
  | 'eq'     // 等于
  | 'neq'    // 不等于
  | 'gt'     // 大于
  | 'gte'    // 大于等于
  | 'lt'     // 小于
  | 'lte'    // 小于等于
  | 'like'   // 模糊匹配
  | 'in'     // 在列表中

/**
 * 单个过滤条件
 */
export interface FilterCondition {
  field: string;           // 字段名
  operator: FilterOperator; // 操作符
  value: any;              // 比较值
}

/**
 * 过滤选项，支持多个条件的组合
 */
export interface FilterOptions {
  conditions?: FilterCondition[];  // 过滤条件
  sortBy?: string;                 // 排序字段
  sortDirection?: 'asc' | 'desc';  // 排序方向
  limit?: number;                  // 限制结果数量
  offset?: number;                 // 结果偏移量
}
/**
 * 提示构建器接口
 */
export interface PromptBuilder<T> {
  buildCreatePrompt(): PromptTemplate;
  buildUpdatePrompt(): PromptTemplate;
}

/**
 * 输出解析器接口
 */
export interface OutputParser<T> {
  parseCreateOutput(output: string): Partial<T>;
  parseUpdateOutput(output: string, existingData: T): Partial<T>;
  parse?(output: string): Partial<T>; // 添加通用解析方法

  // 新增：数组支持
  parseCreateOutputArray?(output: string): Partial<T>[];
  parseUpdateOutputArray?(output: string, existingDataArray: T[]): Partial<T>[];
  parseArray?(output: string): Partial<T>[]; // 通用数组解析方法
  
  /**
   * 解析批量AI生成结果，并区分新创建和更新的项
   * @param output AI生成的原始输出
   * @param existingDataArray 可选的现有数据数组，用于确定哪些是更新项
   * @returns 包含新创建和已更新项分类的结果对象
   */
  parseBatchWithUpdates?(output: string, existingDataArray?: T[]): {
    created: Partial<T>[];
    updated: T[];
  };
}

/**
 * 业务对象类型定义 - 使用驼峰命名法
 */
export interface BusinessObject {
  id?: string | number;
  userId?: string;
  createdAt?: string;
}

/**
 * 业务对象校验接口
 */
export interface ValidAndDefault<BO> {
  /**
   * 校验业务对象
   * @param businessObject 业务对象
   * @param isUpdate 是否为更新操作
   * @throws Error 当验证失败时抛出错误
   */
  validateBO(businessObject: Partial<BO>, isUpdate: boolean): void;
  /**
   * 为业务对象填充默认值
   * @param businessObject 业务对象
   * @param isUpdate 是否为更新操作
   * @returns 填充了默认值的业务对象
   */
  setDefaultsBO(businessObject: Partial<BO>, isUpdate: boolean): Partial<BO>;
}

/**
 * 通用的业务层和数据层对象转换接口
 */
export interface ObjectConverter<BO extends BusinessObject, DO> {
  toBusinessObject(dataObject: DO): BO;
  toDataObject(businessObject: BO): Partial<DO>;
  toBusinessObjects(dataObjects: DO[]): BO[];
  toDataObjects(businessObjects: BO[]): Partial<DO>[];
}