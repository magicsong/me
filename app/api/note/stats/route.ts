import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { notes, tags, notesTags } from '@../../iac/drizzle/schema';
import { eq, and, countDistinct, count, isNotNull, ne } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权：需要用户登录' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // 获取笔记总数
    const totalNotesResult = await db.select({
      count: count()
    })
    .from(notes)
    .where(eq(notes.userId, userId));
    
    const totalNotes = totalNotesResult[0]?.count || 0;
    
    // 获取唯一分类数
    const categoriesResult = await db.select({
      category: notes.category
    })
    .from(notes)
    .where(
      and(
        eq(notes.userId, userId),
        isNotNull(notes.category),
        ne(notes.category, '')
      )
    )
    .groupBy(notes.category);
    
    const categoriesCount = categoriesResult.length;
    
    // 获取唯一标签数
    const tagsResult = await db.select({
      count: count()
    })
    .from(tags)
    .innerJoin(notesTags, eq(tags.id, notesTags.tagId))
    .innerJoin(notes, eq(notesTags.noteId, notes.id))
    .where(eq(notes.userId, userId));
    
    const tagsCount = tagsResult[0]?.count || 0;
    
    return NextResponse.json({
      total: totalNotes,
      categories: categoriesCount,
      tags: tagsCount
    });
  } catch (error) {
    console.error('获取笔记统计失败:', error);
    return NextResponse.json(
      { error: '获取笔记统计失败', details: error.message },
      { status: 500 }
    );
  }
}
