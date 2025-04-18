import { NextRequest, NextResponse } from 'next/server';
import { PomodoroPersistenceService } from '@/lib/persist/pomodoro';
import { getCurrentUserId } from '@/lib/utils';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 获取当前用户ID
    const { id } = await params;
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: '未授权操作' },
        { status: 401 }
      );
    }

    // 获取番茄钟ID
    const pomodoroId = parseInt(id);
    if (isNaN(pomodoroId)) {
      return NextResponse.json(
        { error: '无效的番茄钟ID' },
        { status: 400 }
      );
    }

    // 实例化番茄钟服务
    const pomodoroService = new PomodoroPersistenceService();

    // 获取要更新的番茄钟
    const existingPomodoro = await pomodoroService.findById(pomodoroId);

    // 检查番茄钟是否存在
    if (!existingPomodoro) {
      return NextResponse.json(
        { error: '番茄钟不存在' },
        { status: 404 }
      );
    }

    // 检查是否是当前用户的番茄钟
    if (existingPomodoro.user_id !== userId) {
      return NextResponse.json(
        { error: '无权操作此番茄钟' },
        { status: 403 }
      );
    }

    // 设置当前时间为结束时间
    const now = new Date().toISOString();

    // 更新番茄钟状态为已完成
    const updatedPomodoro = await pomodoroService.update(pomodoroId, {
      status: 'completed',
      end_time: now
    });

    // 返回更新后的番茄钟数据
    return NextResponse.json({
      success: true,
      data: updatedPomodoro
    });

  } catch (error) {
    console.error('完成番茄钟时出错:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
