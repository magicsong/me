'use server';

import { revalidatePath } from 'next/cache';
import { 
  createOrUpdateDailySummary, 
  getDailySummary, 
  checkDailySummaryExists, 
  getRecentDailySummaries 
} from '@/lib/db/db-daily-summary';

/**
 * 保存每日总结
 */
export async function saveDailySummary(date: string, summaryData: any) {
  try {
    await createOrUpdateDailySummary(date, summaryData);
    // 重新验证仪表板路径
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('保存每日总结失败:', error);
    return { success: false, error: '保存总结失败' };
  }
}

/**
 * 获取特定日期的每日总结
 */
export async function fetchDailySummary(date: string) {
  try {
    const summary = await getDailySummary(date);
    return { success: true, data: summary };
  } catch (error) {
    console.error('获取每日总结失败:', error);
    return { success: false, error: '获取总结失败' };
  }
}

/**
 * 检查用户指定日期是否已完成总结
 */
export async function checkSummaryCompletion(dates: string[]) {
  try {
    const results: Record<string, boolean> = {};
    
    for (const date of dates) {
      results[date] = await checkDailySummaryExists(date);
    }
    
    return { success: true, data: results };
  } catch (error) {
    console.error('检查总结完成状态失败:', error);
    return { success: false, error: '检查总结状态失败' };
  }
}

/**
 * 获取用户最近的总结列表
 */
export async function fetchRecentSummaries(limit = 5) {
  try {
    const summaries = await getRecentDailySummaries(limit);
    return { success: true, data: summaries };
  } catch (error) {
    console.error('获取最近总结失败:', error);
    return { success: false, error: '获取最近总结失败' };
  }
}

/**
 * 获取特定日期的习惯数据
 */
export async function fetchDailyHabits(date: string) {
  try {
    const response = await fetch(`/api/habits/daily/${date}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { 
        success: false, 
        message: `获取习惯数据失败: ${errorText}` 
      };
    }

    const data = await response.json();
    return {
      success: true,
      data: {
        completedHabits: data.completedHabits || [],
        totalHabits: data.totalHabits || 0
      }
    };
  } catch (error) {
    console.error("获取习惯数据出错:", error);
    return { 
      success: false, 
      message: "无法连接服务器" 
    };
  }
}
