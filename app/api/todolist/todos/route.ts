import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllTodos, createTodo } from '@/lib/db-todolist';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权：需要用户登录' }, { status: 401 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');
    const tagId = searchParams.get('tagId') ? parseInt(searchParams.get('tagId')!) : undefined;
    
    const todos = await getAllTodos({
      status: status || undefined,
      priority: priority || undefined,
      search: search || undefined,
      tagId
    });
    
    return NextResponse.json(todos);
  } catch (error) {
    console.error('获取待办事项失败:', error);
    return NextResponse.json(
      { error: '获取待办事项失败', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权：需要用户登录' }, { status: 401 });
    }
    
    const body = await request.json();
    
    // 验证请求数据
    if (!body.title) {
      return NextResponse.json({ error: '标题不能为空' }, { status: 400 });
    }
    
    const todo = await createTodo(body);
    
    return NextResponse.json(todo);
  } catch (error) {
    console.error('创建待办事项失败:', error);
    return NextResponse.json(
      { error: '创建待办事项失败', details: error.message },
      { status: 500 }
    );
  }
}
