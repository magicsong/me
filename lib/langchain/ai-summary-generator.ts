import { generateSummaryFeedback } from './chains';
import { 
  getDailySummaryPrompt, 
  getThreeDaySummaryPrompt, 
  getWeeklySummaryPrompt 
} from './prompt-templates';
import { 
  getDailySummary, 
  getThreeDaysSummary, 
  getWeeklySummary 
} from '../db/db-data-fetchers';

/**
 * 根据不同总结类型生成AI总结
 */
export async function generateAISummary(dateStr: string, userId: string, summaryType = 'daily') {
  let context;
  let prompt;

  switch (summaryType) {
    case 'daily':
      context = await getDailySummary(dateStr, userId);
      prompt = getDailySummaryPrompt(dateStr, context);
      break;
      
    case 'three_day':
      context = await getThreeDaysSummary(dateStr, userId);
      prompt = getThreeDaySummaryPrompt(dateStr, context);
      break;
      
    case 'weekly':
      context = await getWeeklySummary(dateStr, userId);
      prompt = getWeeklySummaryPrompt(dateStr, context);
      break;
      
    default:
      throw new Error('不支持的总结类型');
  }

  return await generateSummaryFeedback(prompt);
}
