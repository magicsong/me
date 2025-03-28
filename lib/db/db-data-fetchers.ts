import { db } from './db';
import { addDays, subDays, format } from 'date-fns';

/**
 * 获取指定日期的每日总结数据
 */
export async function getDailySummary(dateStr: string, userId: string) {
  return await db.dailySummary.findFirst({
    where: {
      date: dateStr,
      userId
    }
  });
}

/**
 * 获取最近三天的每日总结数据，保持每天数据独立
 */
export async function getThreeDaysSummary(dateStr: string, userId: string) {
  const targetDate = new Date(dateStr);
  const startDate = format(subDays(targetDate, 2), 'yyyy-MM-dd');
  
  const summaries = await db.dailySummary.findMany({
    where: {
      date: {
        gte: startDate,
        lte: dateStr
      },
      userId
    },
    orderBy: {
      date: 'asc'
    }
  });

  // 返回三天的独立数据数组，不再合并
  return {
    dailySummaries: summaries,
    startDate,
    endDate: dateStr
  };
}

/**
 * 获取最近一周的数据，包括前六天的AI总结和最后一天的详细数据
 */
export async function getWeeklySummary(dateStr: string, userId: string) {
  const targetDate = new Date(dateStr);
  const startDate = format(subDays(targetDate, 6), 'yyyy-MM-dd');
  
  // 获取最后一天的详细数据
  const lastDaySummary = await getDailySummary(dateStr, userId);
  
  // 获取前六天的AI总结
  const previousDaysSummaries = await db.dailySummary.findMany({
    where: {
      date: {
        gte: startDate,
        lt: dateStr
      },
      userId
    },
    select: {
      date: true,
      aiSummary: true
    },
    orderBy: {
      date: 'asc'
    }
  });

  // 合并数据，创建周总结上下文
  return createWeeklySummaryContext(previousDaysSummaries, lastDaySummary);
}

// 删除不再需要的 mergeDailySummaries 函数，因为我们不再合并数据

/**
 * 创建周总结上下文
 */
function createWeeklySummaryContext(previousSummaries: any[], lastDaySummary: any) {
  const weeklyContext = {
    previousDaysSummaries: previousSummaries.map(s => `${s.date}: ${s.aiSummary}`).join('\n'),
    ...lastDaySummary
  };
  
  return weeklyContext;
}
