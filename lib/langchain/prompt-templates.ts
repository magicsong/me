import { DailySummaryContext, ThreeDaySummaryContext, WeeklySummaryContext } from './types';

/**
 * 生成每日总结的提示模板
 */
export function getDailySummaryPrompt(dateStr: string, context: DailySummaryContext): string {
  return `
    以下是我${dateStr.includes(new Date().toISOString().split('T')[0]) ? '今天' : dateStr}的日常总结：
    完成任务: ${context.completedTasks ? context.completedTasks.join(', ') : '无'}
    失败任务：${context.failedTasks ? context.failedTasks.join(', ') : '无'}
    三件好事: ${context.goodThings ? context.goodThings.filter(Boolean).join(', ') : '无'}
    今日收获: ${context.learnings || '无'}
    挑战: ${context.challenges || '无'}
    改进点: ${context.improvements || '无'}
    心情: ${context.mood || '无'}
    精力水平: ${context.energyLevel || '无'}
    睡眠质量: ${context.sleepQuality || '无'}
    明日目标: ${context.tomorrowGoals || '无'}
    
    请根据以上信息，用一句话总结我这一天的情况，包括亮点和改进空间，不超过50个字。
    使用客观但鼓励的语气，直接给出总结，不需要"你的总结是"这样的开头。
  `;
}

/**
 * 生成三天总结的提示模板，展示每天的数据以便观察趋势
 */
export function getThreeDaySummaryPrompt(dateStr: string, context: ThreeDaySummaryContext): string {
  const { dailySummaries, startDate, endDate } = context;
  
  if (!dailySummaries || dailySummaries.length === 0) {
    return `请根据空数据生成三天总结。日期范围: ${startDate || '未知'} 到 ${endDate || '未知'}`;
  }
  // 构建每日数据的字符串表示
  let dailyDataString = '';
  
  dailySummaries.forEach((summary, index) => {
    dailyDataString += `
    === 第${index + 1}天 (${summary.date}) ===
    完成任务: ${summary.completedTasks ? summary.completedTasks.join(', ') : '无'}
    三件好事: ${summary.goodThings ? summary.goodThings.filter(Boolean).join(', ') : '无'}
    今日收获: ${summary.learnings || '无'}
    挑战: ${summary.challenges || '无'}
    改进点: ${summary.improvements || '无'}
    心情: ${summary.mood || '无'}
    精力水平: ${summary.energyLevel || '无'}
    睡眠质量: ${summary.sleepQuality || '无'}
    
    `;
  });

  return `
    以下是我最近三天(${startDate} 到 ${endDate})的日常总结，按天展示:
    
    ${dailyDataString}
    
    请根据以上三天的信息，分析我这三天的整体情况和变化趋势，用两到三句话总结，包括亮点、模式和改进空间，不超过80个字。
    特别注意每天数据的变化趋势，使用客观但鼓励的语气，直接给出总结，不需要"你的总结是"这样的开头。
  `;
}

/**
 * 生成周总结的提示模板
 */
export function getWeeklySummaryPrompt(dateStr: string, context: WeeklySummaryContext): string {
  return `
    以下是我本周(${context.startDate} 到 ${context.endDate})的日常总结：
    
    完成任务: ${context.completedTasks ? context.completedTasks.join(', ') : '无'}
    好事集锦: ${context.goodThings ? context.goodThings.filter(Boolean).join(', ') : '无'}
    一周收获: ${context.learnings || '无'}
    主要挑战: ${context.challenges || '无'}
    待改进方面: ${context.improvements || '无'}
    心情波动: ${context.mood ? context.mood.join(', ') : '无'}
    精力状态: ${context.energyLevel ? context.energyLevel.join(', ') : '无'}
    睡眠情况: ${context.sleepQuality ? context.sleepQuality.join(', ') : '无'}
    下周目标: ${context.nextWeekGoals || '无'}
    
    请根据以上信息，用三到四句话总结我这一周的整体表现，包括成就、模式、挑战和改进方向，不超过100个字。
    分析一周的规律和趋势，使用客观但鼓励的语气，直接给出总结，不需要"你的总结是"这样的开头。
  `;
}
