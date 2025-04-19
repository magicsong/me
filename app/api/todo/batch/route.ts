import { NextRequest, NextResponse } from 'next/server';
import { TodoApiHandler } from '../handler';
import { BatchTodoRequest } from '../types';
import { getCurrentUserId } from '@/lib/utils';

// 创建 TodoApiHandler 实例
const todoHandler = TodoApiHandler.create() as TodoApiHandler;

// PUT 处理程序 - 批量更新待办事项
export async function PUT(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }
    const { todos } = await req.json() as BatchTodoRequest;

    if (!todos || !Array.isArray(todos) || todos.length === 0) {
      return NextResponse.json(
        { success: false, error: '必须提供待办事项数组' },
        { status: 400 }
      );
    }

    // 直接使用userId作为条件进行批量更新
    const updatedTodos = await todoHandler.batchUpdateTodos(todos, userId);

    return NextResponse.json({
      success: true,
      data: updatedTodos,
      message: `已成功更新 ${updatedTodos.length} 个待办事项`
    });
  } catch (error) {
    console.error('批量更新待办事项失败:', error);
    return NextResponse.json(
      { success: false, error: '批量更新待办事项时出错' },
      { status: 500 }
    );
  }
}

// PATCH 方法 - 批量更新待办事项的单个字段
export async function PATCH(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }
    
    const { field, todos } = await req.json() as BatchUpdateFieldRequest;

    if (!field || !todos || !Array.isArray(todos) || todos.length === 0) {
      return NextResponse.json(
        { success: false, error: '必须提供字段名和待办事项数组' },
        { status: 400 }
      );
    }

    // 检查每个todo是否都有id
    for (const todo of todos) {
      if (!todo.id) {
        return NextResponse.json(
          { success: false, error: '所有待办事项必须提供ID' },
          { status: 400 }
        );
      }
    }

    // 直接使用userId作为条件进行批量更新
    const updatedTodos = await todoHandler.batchUpdateField(field, todos, userId);

    return NextResponse.json({
      success: true,
      data: updatedTodos,
      message: `已成功更新 ${updatedTodos.length} 个待办事项的 ${field} 字段`
    });
  } catch (error) {
    console.error('批量更新待办事项字段失败:', error);
    return NextResponse.json(
      { success: false, error: '批量更新待办事项字段时出错' },
      { status: 500 }
    );
  }
}

// POST 方法 - 批量更新待办事项状态
export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }
    
    const { status, todoIds } = await req.json() as BatchUpdateStatusRequest;

    if (status === undefined || !todoIds || !Array.isArray(todoIds) || todoIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '必须提供状态和待办事项ID数组' },
        { status: 400 }
      );
    }

    // 直接使用userId作为条件进行批量更新
    const updatedTodos = await todoHandler.batchUpdateStatus(status, todoIds, userId);

    return NextResponse.json({
      success: true,
      data: updatedTodos,
      message: `已成功将 ${updatedTodos.length} 个待办事项状态更新为 ${status ? '已完成' : '未完成'}`
    });
  } catch (error) {
    console.error('批量更新待办事项状态失败:', error);
    return NextResponse.json(
      { success: false, error: '批量更新待办事项状态时出错' },
      { status: 500 }
    );
  }
}
