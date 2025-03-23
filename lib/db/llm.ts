import 'server-only';

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import {
  pgTable,
  text,
  numeric,
  integer,
  timestamp,
  pgEnum,
  serial,
  boolean,
  date,
  primaryKey,
  json
} from 'drizzle-orm/pg-core';
import { count, eq, ilike, and, sql, desc } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL
});

export const db = drizzle(pool);
// LLM缓存记录表
export const llmCacheRecords = pgTable('llm_cache_records', {
  id: serial('id').primaryKey(),
  requestHash: text('request_hash').notNull(),
  prompt: text('prompt').notNull(),
  model: text('model').notNull(),
  responseContent: text('response_content').notNull(),
  responseThinking: text('response_thinking'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  userId: text('user_id')
});

export type LLMCacheRecord = typeof llmCacheRecords.$inferSelect;
// 保存LLM调用记录到数据库
export async function saveLLMRecordToDB(
    requestHash: string,
    prompt: string,
    model: string,
    responseContent: string,
    responseThinking?: string,
    userId?: string
  ) {
    try {  
      await db.insert(llmCacheRecords).values({
        requestHash,
        prompt,
        model,
        responseContent,
        responseThinking,
        userId
      });
    } catch (error) {
      console.error('保存LLM缓存记录失败:', error);
    }
  }
  
  // 查询符合条件的LLM缓存记录
  export async function findLLMCachedResponse(
    requestHash: string,
    maxAgeMinutes: number = 1
  ): Promise<LLMCacheRecord | null> {
    try {
      const cutoffTime = new Date();
      cutoffTime.setMinutes(cutoffTime.getMinutes() - maxAgeMinutes);
      
      const cachedRecords = await db
        .select()
        .from(llmCacheRecords)
        .where(
          and(
            eq(llmCacheRecords.requestHash, requestHash),
            sql`${llmCacheRecords.createdAt} >= ${cutoffTime}`
          )
        )
        .orderBy(desc(llmCacheRecords.createdAt))
        .limit(1);
      
      return cachedRecords.length > 0 ? cachedRecords[0] : null;
    } catch (error) {
      console.error('查询LLM缓存记录失败:', error);
      return null;
    }
  }