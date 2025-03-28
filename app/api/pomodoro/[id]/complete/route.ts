import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("未授权：需要用户登录");
  }
  const userId = session.user.id;
  const pomodoroId = params.id;
  
  try {
    // 假设存在这个函数，如果没有请在数据库操作库中实现
    const updatedPomodoro = await completePomodoro(pomodoroId, userId);
    return NextResponse.json(updatedPomodoro);
  } catch (error) {
    console.error('完成番茄钟失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
