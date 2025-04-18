import { BaseResponse } from '@/app/api/lib/types';
import { TodoBO } from '../api/types';


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