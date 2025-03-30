import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { todo_tag_relations, todos } from '@../../iac/drizzle/schema';
import { and, eq } from 'drizzle-orm';
import { getCurrentUserId } from '@/lib/utils';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
  
    const { id } = await params;
    const todoId = parseInt(id);
    if (isNaN(todoId)) {
      return NextResponse.json({ error: '无效的待办事项ID' }, { status: 400 });
    }
    
    const userId = await getCurrentUserId()
    
    // 验证待办事项是否存在并属于当前用户
    const todoExists = await db
      .select({ id: todos.id })
      .from(todos)
      .where(and(eq(todos.id, todoId), eq(todos.user_id, userId)));
    
    if (todoExists.length === 0) {
      return NextResponse.json({ error: '待办事项不存在或无权访问' }, { status: 404 });
    }
    
    const { tagIds } = await request.json();
    
    if (!Array.isArray(tagIds)) {
      return NextResponse.json({ error: '标签ID列表格式不正确' }, { status: 400 });
    }
    
    // 删除现有的所有标签关联
    await db
      .delete(todo_tag_relations)
      .where(eq(todo_tag_relations.todo_id, todoId));
    
    // 如果有新的标签，添加关联
    if (tagIds.length > 0) {
      const relations = tagIds.map(tagId => ({
        todo_id: todoId,
        tag_id: tagId
      }));
      
      await db
        .insert(todo_tag_relations)
        .values(relations)
        .onConflictDoNothing();
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新待办事项标签失败:', error);
    return NextResponse.json(
      { error: '更新待办事项标签失败', details: error.message },
      { status: 500 }
    );
  }
}
