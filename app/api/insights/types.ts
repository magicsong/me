import { insightKind } from "@/lib/db/schema";
import { BusinessObject } from "@/app/api/lib/types";

// 业务对象类型定义（驼峰命名）
export interface AIInsightBO extends BusinessObject {
  id?: number;
  userId: string;
  kind: typeof insightKind.enumValues[number];
  title: string;
  content: string;
  contentJson?: any;
  timePeriodStart: string;
  timePeriodEnd: string;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
  referenceIds?: any[];
  tags?: string[];
}

// 数据对象类型定义（下划线命名）
export interface AIInsightDO {
  id: number;
  user_id: string;
  kind: typeof insightKind.enumValues[number];
  title: string;
  content: string;
  content_json?: any;
  time_period_start: string;
  time_period_end: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  reference_ids?: any[];
  tags?: string[];
}
