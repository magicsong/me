import { generateSummaryFeedback } from './chains';
import {
  getDailySummaryPrompt,
  getThreeDaySummaryPrompt,
  getWeeklySummaryPrompt
} from './prompt-templates';

import {
  DailySummaryContext,
  SummaryType,
  ThreeDaySummaryContext,
  WeeklySummaryContext
} from '@/app/api/types';
import { getDailySummary, getRecentDailySummaries, getWeeklySummary } from '../db/db-daily-summary';

import { daily_summaries } from '../../lib/db/schema';
import { JournalEntry } from '../types/jsonb';

// 定义从数据库 schema 推导出的类型
type DailySummaryRow = typeof daily_summaries.$inferSelect;

// 定义生成摘要返回类型
interface SummaryResult {
  summary: string;
  referencedData: {
    id: string | number;
    tableName: string;
    kind?: string;
  }[];
}

/**
 * 将数据库日常总结数据转换为每日总结上下文
 */
function convertToDailySummaryContext(dbData: JournalEntry): DailySummaryContext {
  if (!dbData) {
    return {
      date: '',
      completedTasks: [],
      goodThings: [],
      learnings: [], // 修改为数组类型
      challenges: [], // 修改为数组类型
      improvements: [], // 修改为数组类型
      mood: '',
      energyLevel: '',
      sleepQuality: '',
      tomorrowGoals: '',
      failedHabits: [],
    };
  }

  return {
    ...dbData,
  };
}

/**
 * 将数据库多日总结数据转换为三日总结上下文
 */
function convertToThreeDaySummaryContext(dbData: DailySummaryRow[]): ThreeDaySummaryContext {
  // 如果没有数据，返回空上下文
  if (!dbData || !Array.isArray(dbData) || dbData.length === 0) {
    return {
      dailySummaries: [],
      startDate: '',
      endDate: ''
    };
  }
  const sortedData = [...dbData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    dailySummaries: sortedData.map((i) => { return i.content as DailySummaryContext }),
    startDate: sortedData[0]?.date || '',
    endDate: sortedData[sortedData.length - 1]?.date || ''
  };
}

/**
 * 将数据库周总结数据转换为周总结上下文
 */
function convertToWeeklySummaryContext(dbData: DailySummaryRow): WeeklySummaryContext {
  if (!dbData) {
    return {
      startDate: '',
      endDate: '',
      completedTasks: [],
      goodThings: [],
      learnings: '',
      challenges: '',
      improvements: '',
      mood: [],
      energyLevel: [],
      sleepQuality: [],
      nextWeekGoals: ''
    };
  }

  return {
    completedTasks: (dbData.content as JournalEntry).completedTasks || [],
    goodThings: (dbData.content as JournalEntry).goodThings || [],
    learnings: (dbData.content as JournalEntry).learnings || '',
    challenges: (dbData.content as JournalEntry).challenges || '',
    improvements: (dbData.content as JournalEntry).improvements || '',
    mood: (dbData.content as JournalEntry).mood || '',
    energyLevel: (dbData.content as JournalEntry).energyLevel || '',
    sleepQuality: (dbData.content as JournalEntry).sleepQuality || '',
    tomorrowGoals: (dbData.content as JournalEntry).tomorrowGoals || ''
  };
}

/**
 * 根据不同总结类型生成AI总结
 */
export async function generateAISummary(dateStr: string, userId: string, summaryType = 'daily'): Promise<SummaryResult> {
  let context;
  let prompt;
  let referencedDataArr: { id: string | number; tableName: string }[] = [];

  switch (summaryType) {
    case SummaryType.DAILY:
      const dailyData = await getDailySummary(dateStr);

      context = convertToDailySummaryContext(dailyData.content as JournalEntry);
      prompt = getDailySummaryPrompt(dateStr, context);

      if (dailyData.id) {
        referencedDataArr.push({ id: dailyData.id, tableName: 'daily_summaries' });
      }
      break;

    case SummaryType.THREE_DAY:
      const recentData = await getRecentDailySummaries(3);
      context = convertToThreeDaySummaryContext(recentData);
      prompt = getThreeDaySummaryPrompt(dateStr, context);
      if (recentData && recentData.length > 0) {
        recentData.forEach(item => {
          if (item.id) {
            referencedDataArr.push({ id: item.id, tableName: 'daily_summaries' });
          }
        });
      }
      break;

    case SummaryType.WEEKLY:
      const weeklyData = await getWeeklySummary(dateStr);
      context = convertToWeeklySummaryContext(weeklyData);
      prompt = getWeeklySummaryPrompt(dateStr, context);
      if (weeklyData.id) {
        referencedDataArr.push({ id: weeklyData.id, tableName: 'daily_summaries' });
      }
      break;

    default:
      throw new Error('不支持的总结类型');
  }

  const summary = await generateSummaryFeedback(prompt);

  return {
    summary,
    referencedData: referencedDataArr
  };
}
