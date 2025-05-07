import { BaseResponse } from '@/app/api/lib/types';
import { TagBO, TodoBO } from '../api/types';
import { get } from 'http';
import { getCurrentUserId } from '@/lib/utils';


export async function fetchTodosByDate(date: Date): Promise<BaseResponse<TodoBO>> {
  // 获取选中日期的0点时间
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  // 获取选中日期的23:59:59时间
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  const params = new URLSearchParams({
    plannedDate_gte: startOfDay.toISOString(),
    plannedDate_lte: endOfDay.toISOString(),
  });
  // 使用范围查询运算符，精确获取当天的待办事项
  const response = await fetch(
    `/api/todo?${params.toString()}`
  );

  const result: BaseResponse<TodoBO> = await response.json();
  return result;
}

// 真实API调用 - 获取标签列表
export async function fetchTags(kind?: string): Promise<BaseResponse<TagBO>> {
  try {
    let response;
    if (!kind) {
      response = await fetch(`/api/tag`);
    } else {
      const params = new URLSearchParams({ kind });
      response = await fetch(`/api/tag?${params.toString()}`);
    }
    const result: BaseResponse<TagBO> = await response.json();
    return result;
  } catch (error) {
    console.error("获取标签失败:", error);
    return {
      success: false,
      message: '获取标签失败',
      data: []
    };
  }
}

// 创建标签API
export async function createTagApi(tag: Omit<TagBO, "id">): Promise<BaseResponse<TagBO>> {
  try {
    const response = await fetch('/api/tag', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: tag }),
    });

    const result: BaseResponse<TagBO> = await response.json();
    return result;
  } catch (error) {
    console.error("创建标签失败:", error);
    return {
      success: false,
      message: '创建标签失败',
      data: null
    };
  }
}

// 更新标签API
export async function updateTagApi(tag: TagBO): Promise<BaseResponse<TagBO>> {
  try {
    const response = await fetch(`/api/tag/${tag.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tag),
    });

    const result: BaseResponse<TagBO> = await response.json();
    return result;
  } catch (error) {
    console.error("更新标签失败:", error);
    return {
      success: false,
      message: '更新标签失败',
      data: null
    };
  }
}

// 删除标签API
export async function deleteTagApi(tagId: number): Promise<BaseResponse<boolean>> {
  try {
    const response = await fetch(`/api/tag/${tagId}`, {
      method: 'DELETE',
    });

    const result: BaseResponse<boolean> = await response.json();
    return result;
  } catch (error) {
    console.error("删除标签失败:", error);
    return {
      success: false,
      message: '删除标签失败',
      data: false
    };
  }
}