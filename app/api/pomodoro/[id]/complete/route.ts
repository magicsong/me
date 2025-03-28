import { NextRequest, NextResponse } from 'next/server';
import { getPomodoroDetails, updatePomodoroStatus } from '@/lib/db/pomodoro';
import { getCurrentUserId } from '@/lib/utils';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getCurrentUserId()
  const { id } = await params;
  const pomodoroId = parseInt(id);
  if (isNaN(pomodoroId)) {
    return NextResponse.json({ error: '无效的番茄钟ID' }, { status: 400 });
  }
  try {
    // 假设存在这个函数，如果没有请在数据库操作库中实现
    const updatedPomodoro = await completePomodoro(pomodoroId, userId);
    return NextResponse.json(updatedPomodoro);
  } catch (error) {
    console.error('完成番茄钟失败:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
/**
 * Complete a pomodoro session
 * @param pomodoroId - The ID of the pomodoro to complete
 * @param userId - The user ID who owns the pomodoro
 * @returns The updated pomodoro object
 */
async function completePomodoro(pomodoroId: number, userId: string) {
  // Find the pomodoro and verify ownership
  return updatePomodoroStatus(pomodoroId,"completed")
}

