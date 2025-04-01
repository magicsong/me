/**
 * 标签类型定义
 */
export interface Tag {
  id: number;
  name: string;
}

/**
 * 笔记元数据API响应
 */
export interface NoteMetadataResponse {
  categories: string[];
  tags: Tag[];
}

/**
 * 更新笔记元数据请求体
 */
export interface UpdateNoteMetadataRequest {
  category?: string;
  tagIds?: number[];
}

/**
 * 更新笔记元数据响应
 */
export interface UpdateNoteMetadataResponse {
  message: string;
}

/**
 * API错误响应
 */
export interface ApiErrorResponse {
  error: string;
}
