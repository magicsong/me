import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTodo, updateTodo, deleteTodo } from '@/lib/db-todolist';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权：需要用户登录' }, { status: 401 });
    }

    const { id } = await params;
    const todoId = parseInt(id);
    if (isNaN(todoId)) {
      return NextResponse.json({ error: '无效的待办事项ID' }, { status: 400 });
    }

    const todo = await getTodo(todoId);
    if (!todo) {
      return NextResponse.json({ error: '待办事项不存在' }, { status: 404 });
    }

    return NextResponse.json(todo);
  } catch (error) {
    console.error('获取待办事项详情失败:', error);
    return NextResponse.json(
      { error: '获取待办事项详情失败', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const todoId = parseInt(id);
    if (isNaN(todoId)) {
      return NextResponse.json({ error: '无效的待办事项ID' }, { status: 400 });
    }

    const body = await request.json();
    const updatedTodo = await updateTodo(todoId, body);

    if (!updatedTodo) {
      return NextResponse.json({ error: '待办事项不存在或无权更新' }, { status: 404 });
    }

    return NextResponse.json(updatedTodo);
  } catch (error) {
    console.error('更新待办事项失败:', error);
    return NextResponse.json(
      { error: '更新待办事项失败', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const todoId = parseInt(id);
    if (isNaN(todoId)) {
      return NextResponse.json({ error: '无效的待办事项ID' }, { status: 400 });
    }

    await deleteTodo(todoId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除待办事项失败:', error);
    return NextResponse.json(
      { error: '删除待办事项失败', details: error.message },
      { status: 500 }
    );
  }
}
