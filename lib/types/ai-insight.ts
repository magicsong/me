import { insightKind } from '@../../iac/drizzle/schema';

/**
 * AI 洞察数据类型
 */
export interface InsightData {
  user_id: string;
  kind: typeof insightKind.enumValues[number];
  title: string;
  content: string;
  content_json?: Record<string, any> | null;
  time_period_start: Date;
  time_period_end: Date;
  metadata?: Record<string, any> | null;
  reference_ids?: number[] | null;
  tags?: string[] | null;
}

/**
 * 用于更新 AI 洞察的数据类型
 */
export interface UpdateInsightData {
  title?: string;
  content?: string;
  content_json?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
  reference_ids?: number[] | null;
  tags?: string[] | null;
}

/**
 * AI 洞察查询选项
 */
export interface InsightQueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  sortDirection?: 'asc' | 'desc';
}
