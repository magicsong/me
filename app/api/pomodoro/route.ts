import { NextRequest, NextResponse } from 'next/server';
import { createPomodoro, getUserPomodoros } from '@/lib/db/pomodoro';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("未授权：需要用户登录");
    }
    const userId = session.user.id;
  
  try {
    const { title, description, duration, habitId, goalId, tagIds } = await request.json();
    
    if (!title) {
      return NextResponse.json({ error: '标题不能为空' }, { status: 400 });
    }
    
    const pomodoro = await createPomodoro({
      title,
      description,
      duration: duration || 25,
      userId,
      habitId,
      goalId,
      tagIds
    });
    
    return NextResponse.json(pomodoro);
  } catch (error) {
    console.error('创建番茄钟失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("未授权：需要用户登录");
    }
    const userId = session.user.id;
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status') as any;
    
    const pomodoros = await getUserPomodoros(
      userId,
      status || undefined,
      limit,
      offset
    );
    
    return NextResponse.json(pomodoros);
  } catch (error) {
    console.error('获取番茄钟列表失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
