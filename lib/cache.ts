import crypto from 'crypto';
import { db } from './db';
import { llm_cache_records } from './db/schema';
import { eq, and, gt } from 'drizzle-orm';

/**
 * 生成请求哈希值用于缓存键
 */
export function generateCacheKey(data: Record<string, any>): string {
  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(data));
  return hash.digest('hex');
}

/**
 * 获取缓存的LLM响应（3小时内有效）
 */
export async function getCachedLLMResponse(
  requestHash: string,
  userId?: string
): Promise<{ response_content: string; response_thinking?: string } | null> {
  try {
    // 3小时 = 3 * 60 * 60 * 1000 ms
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();

    const result = await db
      .select()
      .from(llm_cache_records)
      .where(
        and(
          eq(llm_cache_records.request_hash, requestHash),
          gt(llm_cache_records.created_at, threeHoursAgo)
        )
      )
      .limit(1);

    if (result.length > 0) {
      const cached = result[0];
      return {
        response_content: cached.response_content,
        response_thinking: cached.response_thinking || undefined,
      };
    }

    return null;
  } catch (error) {
    console.error('获取缓存失败:', error);
    return null;
  }
}

/**
 * 保存LLM响应到缓存
 */
export async function cacheLLMResponse(
  requestHash: string,
  prompt: string,
  model: string,
  responseContent: string,
  responseThinking?: string,
  userId?: string
): Promise<void> {
  try {
    await db.insert(llm_cache_records).values({
      request_hash: requestHash,
      prompt,
      model,
      response_content: responseContent,
      response_thinking: responseThinking,
      created_at: new Date().toISOString(),
      user_id: userId,
    });
  } catch (error) {
    console.error('保存缓存失败:', error);
    // 不抛出错误，缓存失败不应该影响业务流程
  }
}
