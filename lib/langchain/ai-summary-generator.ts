import { generateSummaryFeedback } from './chains';
import {
  getDailySummaryPrompt,
  getThreeDaySummaryPrompt,
  getWeeklySummaryPrompt
} from './prompt-templates';

import { getDailySummary, getWeeklySummary, getRecentDailySummaries } from '../db/db-daily-summary';
import { 
  DailySummaryContext, 
  ThreeDaySummaryContext, 
  WeeklySummaryContext, 
  SummaryType,
  BaseSummaryItem
} from './types';

import {daily_summaries} from '../../lib/db/schema'
import { JournalEntry } from '../types/jsonb';

// 定义从数据库 schema 推导出的类型
type DailySummaryRow = typeof daily_summaries.$inferSelect;
// 将 content 定义为 JournalEntry 类型
type DailySummaryContent = JournalEntry;

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
function convertToDailySummaryContext(dbData: DailySummaryContent): DailySummaryContext {
  if (!dbData) {
    return {
      date: '',
      completedTasks: [],
      goodThings: [],
      learnings: '', // 修改为数组类型
      challenges: '', // 修改为数组类型
      improvements: '', // 修改为数组类型
      mood: '',
      energyLevel: '',
      sleepQuality: '',
      tomorrowGoals: ''
    };
  }
  
  return {
    date: dbData.date || '',
    completedTasks: dbData.completedTasks || [],
    goodThings: dbData.goodThings || [],
    learnings: dbData.learnings || '',
    challenges: dbData.challenges || '',
    improvements: dbData.improvements[0] || '',
    mood: dbData.mood || '',
    energyLevel: dbData.energyLevel || '',
    sleepQuality: dbData.sleepQuality || '',
    tomorrowGoals: dbData.tomorrowGoals || ''
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
  
  const dailySummaries: BaseSummaryItem[] = sortedData.map(item => ({
    date: (item.content as JournalEntry).date || '',
    completedTasks: (item.content as JournalEntry).completedTasks || [],
    completionCount: (item.content as JournalEntry).completionCount || 0,
    completionScore: (item.content as JournalEntry).completionScore || 0,
    goodThings: (item.content as JournalEntry).goodThings || [],
    learnings: (item.content as JournalEntry).learnings || '',
    challenges: (item.content as JournalEntry).challenges || '',
    improvements: (item.content as JournalEntry).improvements || '',
    mood: (item.content as JournalEntry).mood || '',
    energyLevel: (item.content as JournalEntry).energyLevel || '',
    sleepQuality: (item.content as JournalEntry).sleepQuality || '',
    tomorrowGoals: (item.content as JournalEntry).tomorrowGoals || ''
  }));
  
  return {
    dailySummaries,
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
  let referencedDataArr: {id: string | number; tableName: string}[] = [];

  switch (summaryType) {
    case SummaryType.DAILY:
      const dailyData = await getDailySummary(dateStr);
      const yesterdayDate = new Date(dateStr);
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayStr = yesterdayDate.toISOString().split('T')[0];
      const yesterdayData = await getDailySummary(yesterdayStr);

      context = convertToDailySummaryContext(dailyData.content as JournalEntry);
      const yesterdaySummary = JSON.stringify(yesterdayData?.content) || '';
      prompt = getDailySummaryPrompt(dateStr, context, yesterdaySummary);

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
