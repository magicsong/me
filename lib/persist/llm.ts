import { db } from '@/lib/db';
import { llm_cache_records } from '@/lib/db/schema';
import { and, desc, eq, sql } from 'drizzle-orm';

export type LLMCacheRecord = typeof llm_cache_records.$inferSelect;
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
            .from(llm_cache_records)
            .where(
                and(
                    eq(llm_cache_records.request_hash, requestHash),
                    sql`${llm_cache_records.created_at} >= ${cutoffTime}`
                )
            )
            .orderBy(desc(llm_cache_records.created_at))
            .limit(1);

        return cachedRecords.length > 0 ? cachedRecords[0] : null;
    } catch (error) {
        console.error('查询LLM缓存记录失败:', error);
        return null;
    }
}

// 保存LLM调用记录到数据库
export async function saveLLMRecordToDB(
    requestHash: string,
    prompt: string,
    model: string,
    response_content: string,
    response_thinking?: string,
    user_id?: string
) {
    try {
        await db.insert(llm_cache_records).values({
            request_hash: requestHash,
            prompt,
            model,
            response_content,
            response_thinking,
            user_id
        });
    } catch (error) {
        console.error('保存LLM缓存记录失败:', error);
    }
}