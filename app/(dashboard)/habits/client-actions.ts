"use client";

import { HabitBO, TodoBO } from "@/app/api/types";
import { getCurrentUserId } from "@/lib/utils";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

// 更新 completeHabit 函数，使用API而不是直接访问数据库
export async function completeHabit(
    habitId: number,
    options?: {
        tierId?: number;
        comment?: string;
        difficulty?: string;
        completedAt?: string;
        status?: string;
        failureReason?: string;
    }
) {
    // 执行打卡 - 调用 API
    const response = await fetch('/api/habit/checkin', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            habitId,
            tierId: options?.tierId,
            comment: options?.comment,
            difficulty: options?.difficulty,
            completedAt: options?.completedAt,
            status: options?.status,
            failureReason: options?.failureReason

        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '打卡失败');
    }
    return { success: true };
}

// 修改 completeHabitOnDate 函数，使用新的 completeHabit 函数
export async function completeHabitOnDate(habitId: number, date: string) {
    // 检查环境变量是否允许补打卡
    if (process.env.NEXT_PUBLIC_ALLOW_BACKFILL !== 'true') {
        throw new Error('补打卡功能未启用');
    }

    // 确保日期有效
    const targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) {
        throw new Error('无效的日期格式');
    }

    // 使用 completeHabit 进行补打卡
    return completeHabit(habitId, { completedAt: date });
}


export async function getHabits(date?: Date): Promise<HabitBO[]> {
    let url = '/api/habit'
    if (date) {
        url = url + '?date=' + format(date, 'yyyy-MM-dd');
    }
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('获取习惯数据失败');
    }
    const data = await response.json();
    if (data.success) {
        return data.data
    }
    throw new Error(data.error);
}

// 处理删除待办事项
export async function deleteTodo(todoId: number): Promise<boolean> {
    const response = await fetch(`/api/todo/${todoId}`, {
        method: 'DELETE',
    });

    const result = await response.json();
    if (result.success) {
        return true;
    }
    throw new Error(result.error);
}

export async function createTodo(todo: Partial<TodoBO>): Promise<TodoBO> {
    const response = await fetch('/api/todo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            data: {
                ...todo,
                status: 'pending',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        }),
    });

    const result = await response.json();
    if (result.success) {
        return result.data;
    }
    throw new Error(result.error)
}


// 获取习惯详情，包括挑战阶梯
export async function getHabitDetail(habitId: number) {
    const response = await fetch(`/api/habit/${habitId}`, {
        method: 'GET',
    });

    if (!response.ok) {
        throw new Error('获取习惯详情失败');
    }

    const data = await response.json();
    if (data.success) {
        return data.data;
    }
    throw new Error(data.error);
}