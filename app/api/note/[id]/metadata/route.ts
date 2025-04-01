import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notes, tags, notesTags } from '@/iac/drizzle/schema';
import { auth } from '@clerk/nextjs';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { 
  ApiErrorResponse, 
  UpdateNoteMetadataRequest, 
  UpdateNoteMetadataResponse 
} from '@/app/api/types/note';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<UpdateNoteMetadataResponse | ApiErrorResponse>> {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    
    const noteId = Number(params.id);
    if (isNaN(noteId)) {
      return NextResponse.json({ error: '无效的笔记ID' }, { status: 400 });
    }
    
    const body: UpdateNoteMetadataRequest = await req.json();
    const { category, tagIds } = body;
    
    // 检查笔记是否存在且属于当前用户
    const existingNote = await db.select({ id: notes.id })
      .from(notes)
      .where(and(
        eq(notes.id, noteId),
        eq(notes.userId, userId)
      ))
      .execute();
    
    if (!existingNote.length) {
      return NextResponse.json({ error: '找不到该笔记' }, { status: 404 });
    }
    
    // 开启事务以确保数据一致性
    await db.transaction(async (tx) => {
      // 1. 更新笔记分类
      if (category !== undefined) {
        await tx.update(notes)
          .set({ category, updatedAt: new Date() })
          .where(eq(notes.id, noteId))
          .execute();
      }
      
      // 2. 更新笔记标签关系（如果提供了标签）
      if (tagIds !== undefined && Array.isArray(tagIds)) {
        // 先删除该笔记的所有标签关系
        await tx.delete(notesTags)
          .where(eq(notesTags.noteId, noteId))
          .execute();
        
        // 如果有新标签，则添加新关系
        if (tagIds.length > 0) {
          // 验证标签是否都属于当前用户
          const validTags = await tx.select({ id: tags.id })
            .from(tags)
            .where(and(
              inArray(tags.id, tagIds),
              eq(tags.userId, userId)
            ))
            .execute();
          
          const validTagIds = validTags.map(tag => tag.id);
          
          // 插入新的标签关系
          if (validTagIds.length > 0) {
            await tx.insert(notesTags)
              .values(
                validTagIds.map(tagId => ({
                  noteId,
                  tagId
                }))
              )
              .execute();
          }
        }
      }
    });
    
    return NextResponse.json(
      { message: '笔记元数据更新成功' } as UpdateNoteMetadataResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error('更新笔记元数据失败:', error);
    return NextResponse.json(
      { error: '更新笔记元数据失败' } as ApiErrorResponse,
      { status: 500 }
    );
  }
}
