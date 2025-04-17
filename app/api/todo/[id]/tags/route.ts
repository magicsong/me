import { NextRequest, NextResponse } from 'next/server';
import { TodoPersistenceService } from '@/lib/persist/todo';
import { getCurrentUserId } from '@/lib/utils';

// 添加标签
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
    const { id } = await params;
    if (isNaN(Number(id))) {
      return NextResponse.json(
        { error: '无效的待办事项ID' },
        { status: 400 }
      );
    }

    // 从请求体获取标签ID数组
    const { tagIds } = await request.json();
    if (!tagIds || !Array.isArray(tagIds)) {
      return NextResponse.json(
        { error: '标签ID必须是一个数组' },
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

    // 使用新的标签管理方法添加标签关系
    await todoService.addTagsToTodo(Number(id), tagIds);
    
    // 获取更新后的待办事项（包含最新的标签）
    const updatedTodo = await todoService.findById(id);

    // 返回更新后的待办事项数据
    return NextResponse.json({
      success: true,
      data: updatedTodo
    });
    
  } catch (error) {
    console.error('添加标签时出错:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

// 删除标签
export async function DELETE(
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
    const { id } = await params;
    if (isNaN(Number(id))) {
      return NextResponse.json(
        { error: '无效的待办事项ID' },
        { status: 400 }
      );
    }

    // 从URL中获取要删除的标签ID数组
    const url = new URL(request.url);
    const tagIdsParam = url.searchParams.get('tagIds');
    
    if (!tagIdsParam) {
      return NextResponse.json(
        { error: '请提供要删除的标签ID' },
        { status: 400 }
      );
    }
    
    // 转换tagIds字符串为数组（格式如：tagIds=1,2,3）
    const tagIds = tagIdsParam.split(',').map(id => parseInt(id.trim(), 10));
    
    if (tagIds.some(id => isNaN(id))) {
      return NextResponse.json(
        { error: '标签ID必须是有效的数字' },
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

    // 使用新的标签管理方法删除标签关系
    await todoService.removeTagsFromTodo(Number(id), tagIds);
    
    // 获取更新后的待办事项（包含最新的标签）
    const updatedTodo = await todoService.findById(id);

    // 返回更新后的待办事项数据
    return NextResponse.json({
      success: true,
      data: updatedTodo
    });
    
  } catch (error) {
    console.error('删除标签时出错:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
