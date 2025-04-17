import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notes, tags } from '@/lib/db/schema';
import { desc, eq, SQL } from 'drizzle-orm';
import { ApiErrorResponse, NoteMetadataResponse } from '../../types/note';
import { getCurrentUserId } from '@/lib/utils';

export async function GET(): Promise<NextResponse<NoteMetadataResponse | ApiErrorResponse>> {
  try {
    const userId = await getCurrentUserId

    // 获取所有不为空的唯一分类
    const categoriesResult = await db.selectDistinct({ category: notes.category })
      .from(notes)
      .where(eq(notes.userId, userId))
      .execute();
    
    // 过滤掉null或空字符串的分类
    const categories = categoriesResult
      .map(item => item.category)
      .filter((category): category is string => !!category);
    
    // 获取所有标签
    const tagsResult = await db.select({
      id: tags.id,
      name: tags.name,
    })
    .from(tags)
    .where(eq(tags.userId, userId))
    .orderBy(tags.name)
    .execute();

    return NextResponse.json(
      { 
        categories, 
        tags: tagsResult
      } as NoteMetadataResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error('获取笔记元数据失败:', error);
    return NextResponse.json(
      { error: '获取笔记元数据失败' } as ApiErrorResponse,
      { status: 500 }
    );
  }
}
