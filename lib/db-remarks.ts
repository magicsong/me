import { db } from './db';
import { remarks } from './db/schema';
import { Remark, CreateRemarkInput } from './types';
import { eq, and, desc } from 'drizzle-orm';

/**
 * 保存remark
 */
export async function createRemark(
  userId: string,
  input: CreateRemarkInput
): Promise<Remark> {
  const [created] = await db.insert(remarks).values({
    user_id: userId,
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    content: input.content,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).returning();

  return created as Remark;
}

/**
 * 获取某个实体的所有remarks
 */
export async function getRemarksByEntity(
  entityType: string,
  entityId: number
): Promise<Remark[]> {
  return await db.select().from(remarks)
    .where(
      and(
        eq(remarks.entity_type, entityType),
        eq(remarks.entity_id, entityId)
      )
    )
    .orderBy(desc(remarks.created_at));
}

/**
 * 删除remark
 */
export async function deleteRemark(remarkId: number): Promise<boolean> {
  const result = await db.delete(remarks).where(eq(remarks.id, remarkId));
  return (result.rowCount || 0) > 0;
}
