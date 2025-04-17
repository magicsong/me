import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { pomodoro_tags, todo_tag_relations } from '@../../lib/db/schema';
import { and, eq } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权：需要用户登录' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const { id } = await params;
    const tagId = parseInt(id);
    
    if (isNaN(tagId)) {
      return NextResponse.json({ error: '无效的标签ID' }, { status: 400 });
    }
    
    const { name, color } = await request.json();
    
    if (!name || !name.trim()) {
      return NextResponse.json({ error: '标签名称不能为空' }, { status: 400 });
    }
    
    // 更新标签
    const [updatedTag] = await db
      .update(pomodoro_tags)
      .set({
        name: name.trim(),
        color: color || '#3B82F6'
      })
      .where(and(
        eq(pomodoro_tags.id, tagId),
        eq(pomodoro_tags.user_id, userId)
      ))
      .returning();
    
    if (!updatedTag) {
      return NextResponse.json({ error: '标签不存在或无权更新' }, { status: 404 });
    }
    
    return NextResponse.json(updatedTag);
  } catch (error) {
    console.error('更新标签失败:', error);
    return NextResponse.json(
      { error: '更新标签失败', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权：需要用户登录' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const tagId = parseInt(params.id);
    
    if (isNaN(tagId)) {
      return NextResponse.json({ error: '无效的标签ID' }, { status: 400 });
    }
    
    // 验证标签是否存在并属于当前用户
    const tagExists = await db
      .select({ id: pomodoro_tags.id })
      .from(pomodoro_tags)
      .where(and(
        eq(pomodoro_tags.id, tagId),
        eq(pomodoro_tags.user_id, userId)
      ));
    
    if (tagExists.length === 0) {
      return NextResponse.json({ error: '标签不存在或无权删除' }, { status: 404 });
    }
    
    // 首先删除所有与此标签相关的关联
    await db
      .delete(todo_tag_relations)
      .where(eq(todo_tag_relations.tag_id, tagId));
    
    // 然后删除标签本身
    await db
      .delete(pomodoro_tags)
      .where(eq(pomodoro_tags.id, tagId));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除标签失败:', error);
    return NextResponse.json(
      { error: '删除标签失败', details: error.message },
      { status: 500 }
    );
  }
}
