"use client";

import { HabitBO } from "@/app/api/types";
import { format } from "date-fns";

// 更新 completeHabit 函数，使用API而不是直接访问数据库
export async function completeHabit(
    habitId: number,
    options?: {
        tierId?: number;
        comment?: string;
        difficulty?: string;
        completedAt?: string;
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
            completedAt: options?.completedAt
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