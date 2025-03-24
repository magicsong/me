import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getPomodoroDetails, updatePomodoroStatus } from '@/lib/db/pomodoro';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未授权：需要用户登录' }, { status: 401 });
  }
  
  const userId = session.user.id;
  const { id } = await params;
  const pomodoroId = parseInt(id);
  
  if (isNaN(pomodoroId)) {
    return NextResponse.json({ error: '无效的番茄钟ID' }, { status: 400 });
  }
  
  try {
    const { status } = await request.json();
    
    if (!status) {
      return NextResponse.json({ error: '状态不能为空' }, { status: 400 });
    }
    
    // 首先确认番茄钟存在并属于当前用户
    const existingPomodoro = await getPomodoroDetails(pomodoroId);
    
    if (!existingPomodoro || existingPomodoro.user_id !== userId) {
      return NextResponse.json(
        { error: '未找到番茄钟或您无权修改此番茄钟' },
        { status: 404 }
      );
    }
    
    // 更新番茄钟状态
    const updatedPomodoro = await updatePomodoroStatus(pomodoroId, status);
    
    return NextResponse.json(updatedPomodoro);
  } catch (error) {
    console.error('更新番茄钟状态失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未授权：需要用户登录' }, { status: 401 });
  }
  
  const userId = session.user.id;
  const { id } = await params;
  const pomodoroId = parseInt(id);
  
  if (isNaN(pomodoroId)) {
    return NextResponse.json({ error: '无效的番茄钟ID' }, { status: 400 });
  }
  
  try {
    // 查询番茄钟及其状态
    const pomodoro = await getPomodoroDetails(pomodoroId);
    
    if (!pomodoro || pomodoro.user_id !== userId) {
      return NextResponse.json(
        { error: '未找到番茄钟或您无权查看此番茄钟' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(pomodoro);
  } catch (error) {
    console.error('获取番茄钟状态失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
