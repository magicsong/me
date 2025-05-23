import 'server-only';

import { and, count, desc, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import {
  pgTable,
  serial,
  text,
  timestamp
} from 'drizzle-orm/pg-core';
import { Pool } from 'pg';

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

// 获取LLM历史记录(分页)
export async function getLLMHistory(
  page: number = 1,
  pageSize: number = 10,
  userId?: string
) {
  try {
    const offset = (page - 1) * pageSize;
    
    let query = db
      .select()
      .from(llmCacheRecords)
      .orderBy(desc(llmCacheRecords.createdAt))
      .limit(pageSize)
      .offset(offset);
      
    if (userId) {
      query = query.where(eq(llmCacheRecords.userId, userId));
    }
    
    const records = await query;
    
    // 获取总记录数
    let countQuery = db
      .select({ count: count() })
      .from(llmCacheRecords);
      
    if (userId) {
      countQuery = countQuery.where(eq(llmCacheRecords.userId, userId));
    }
    
    const [{ count: total }] = await countQuery;
    
    return {
      records,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(Number(total) / pageSize)
      }
    };
  } catch (error) {
    console.error('获取LLM历史记录失败:', error);
    throw error;
  }
}

// 根据ID获取单条LLM记录
export async function getLLMRecordById(id: number): Promise<LLMCacheRecord | null> {
  try {
    const records = await db
      .select()
      .from(llmCacheRecords)
      .where(eq(llmCacheRecords.id, id))
      .limit(1);
      
    return records.length > 0 ? records[0] : null;
  } catch (error) {
    console.error('获取LLM记录详情失败:', error);
    return null;
  }
}