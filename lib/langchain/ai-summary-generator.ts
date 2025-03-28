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

/**
 * 将数据库日常总结数据转换为每日总结上下文
 */
function convertToDailySummaryContext(dbData: any): DailySummaryContext {
  if (!dbData) {
    return {
      date: '',
      completedTasks: [],
      goodThings: [],
      learnings: '',
      challenges: '',
      improvements: '',
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
    improvements: dbData.improvements || '',
    mood: dbData.mood || '',
    energyLevel: dbData.energyLevel || '',
    sleepQuality: dbData.sleepQuality || '',
    tomorrowGoals: dbData.tomorrowGoals || ''
  };
}

/**
 * 将数据库多日总结数据转换为三日总结上下文
 */
function convertToThreeDaySummaryContext(dbData: any[]): ThreeDaySummaryContext {
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
    date: item.date || '',
    completedTasks: item.completedTasks || [],
    completionCount: item.completionCount || 0,
    completionScore: item.completionScore || 0,
    goodThings: item.goodThings || [],
    learnings: item.learnings || '',
    challenges: item.challenges || '',
    improvements: item.improvements || '',
    mood: item.mood || '',
    energyLevel: item.energyLevel || '',
    sleepQuality: item.sleepQuality || '',
    tomorrowGoals: item.tomorrowGoals || ''
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
function convertToWeeklySummaryContext(dbData: any): WeeklySummaryContext {
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
    startDate: dbData.startDate || '',
    endDate: dbData.endDate || '',
    completedTasks: dbData.completedTasks || [],
    goodThings: dbData.goodThings || [],
    learnings: dbData.learnings || '',
    challenges: dbData.challenges || '',
    improvements: dbData.improvements || '',
    mood: dbData.mood || [],
    energyLevel: dbData.energyLevel || [],
    sleepQuality: dbData.sleepQuality || [],
    nextWeekGoals: dbData.nextWeekGoals || ''
  };
}

/**
 * 根据不同总结类型生成AI总结
 */
export async function generateAISummary(dateStr: string, userId: string, summaryType = 'daily') {
  let context;
  let prompt;

  switch (summaryType) {
    case SummaryType.DAILY:
      const dailyData = await getDailySummary(dateStr);
      context = convertToDailySummaryContext(dailyData.content);
      prompt = getDailySummaryPrompt(dateStr, context);
      break;

    case SummaryType.THREE_DAY:
      const recentData = await getRecentDailySummaries(3);
      context = convertToThreeDaySummaryContext(recentData);
      prompt = getThreeDaySummaryPrompt(dateStr, context);
      break;

    case SummaryType.WEEKLY:
      const weeklyData = await getWeeklySummary(dateStr);
      context = convertToWeeklySummaryContext(weeklyData);
      prompt = getWeeklySummaryPrompt(dateStr, context);
      break;

    default:
      throw new Error('不支持的总结类型');
  }

  return await generateSummaryFeedback(prompt);
}
