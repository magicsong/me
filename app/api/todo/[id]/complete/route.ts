import { NextRequest, NextResponse } from 'next/server';
import { TodoPersistenceService } from '@/lib/persist/todo';
import { getCurrentUserId } from '@/lib/utils';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 获取当前用户ID
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: '未授权操作' },
        { status: 401 }
      );
    }

    // 获取待办事项ID
    const {id} = await params;
    if (isNaN(Number(id))) {
      return NextResponse.json(
        { error: '无效的待办事项ID' },
        { status: 400 }
      );
    }

    // 实例化Todo服务
    const todoService = new TodoPersistenceService();
    
    // 获取要更新的待办事项
    const existingTodo = await todoService.findById(id);
    
    // 检查待办事项是否存在
    if (!existingTodo) {
      return NextResponse.json(
        { error: '待办事项不存在' },
        { status: 404 }
      );
    }
    
    // 检查是否是当前用户的待办事项
    if (existingTodo.user_id !== userId) {
      return NextResponse.json(
        { error: '无权操作此待办事项' },
        { status: 403 }
      );
    }

    // 设置当前时间为完成时间
    const now = new Date().toISOString();
    
    // 更新待办事项状态为已完成
    const updatedTodo = await todoService.update(id, {
      status: 'completed',
      completed_at: now
    });

    // 返回更新后的待办事项数据
    return NextResponse.json({
      success: true,
      data: updatedTodo
    });
    
  } catch (error) {
    console.error('完成待办事项时出错:', error);
    return NextResponse.json(
      { error: error },
      { status: 500 }
    );
  }
}
