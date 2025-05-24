import { DailySummaryContext, ThreeDaySummaryContext, WeeklySummaryContext } from '@/app/api/types';

/**
 * 生成每日总结的提示模板
 */
export function getDailySummaryPrompt(dateStr: string, context: DailySummaryContext): string {
  const prompts = [`   以下是我${dateStr.includes(new Date().toISOString().split('T')[0]) ? '今天' : dateStr}的日常总结：
    完成习惯: ${context.completedHabits ? context.completedHabits.join(', ') : '无'}
    失败习惯：${context.failedHabits ? context.failedHabits.join(', ') : '无'}
    完成任务：${context.completedTasks ? context.completedTasks.join(', ') : '无'}
    失败任务：${context.failedTasks ? context.failedTasks.join(', ') : '无'}
    三件好事: ${context.goodThings ? context.goodThings.join(', ') : '无'}
    今日收获: ${context.learnings || '无'}
    挑战: ${context.challenges || '无'}
    改进点: ${context.improvements || '无'}
    心情: ${context.mood || '无'}
    精力水平: ${context.energyLevel || '无'}
    睡眠质量: ${context.sleepQuality || '无'}
    明日目标: ${context.tomorrowGoals || '无'} 请根据以上信息，用一句话总结我这一天的情况，包括亮点和改进空间，适当分析一下趋势。
    使用客观但鼓励的语气，直接给出总结，不需要"你的总结是"这样的开头。`, 
    `以下是我${dateStr.includes(new Date().toISOString().split('T')[0]) ? '今天' : dateStr}的日常总结：
    完成习惯: ${context.completedHabits ? context.completedHabits.join(', ') : '无'}
    失败习惯：${context.failedHabits ? context.failedHabits.join(', ') : '无'}
    完成任务：${context.completedTasks ? context.completedTasks.join(', ') : '无'}
    失败任务：${context.failedTasks ? context.failedTasks.join(', ') : '无'}
    三件好事: ${context.goodThings ? context.goodThings.join(', ') : '无'}
    今日收获: ${context.learnings || '无'}
    挑战: ${context.challenges || '无'}
    改进点: ${context.improvements || '无'}
    心情: ${context.mood || '无'}
    精力水平: ${context.energyLevel || '无'}
    睡眠质量: ${context.sleepQuality || '无'}
    明日目标: ${context.tomorrowGoals || '无'}
    
    请根据以上信息，总结我这一天的情况，指出亮点，尽量易懂友好一些，同时如果引用了一些比较难以理解的名词，请给出简短解释。可以结合前面的对话，分析几天趋势
    使用客观但鼓励的语气，发现问题需要客观柔和指出，针对问题提出友好意见，结合明日规划，给出相应的建议，需要有条理，副标题内容，有序罗列。直接给出总结，不需要"你的总结是"这样的开头。`,
    `以下是我${dateStr.includes(new Date().toISOString().split('T')[0]) ? '今天' : dateStr}的日常总结：
    完成习惯: ${context.completedHabits ? context.completedHabits.join(', ') : '无'}
    失败习惯：${context.failedHabits ? context.failedHabits.join(', ') : '无'}
    完成任务：${context.completedTasks ? context.completedTasks.join(', ') : '无'}
    失败任务：${context.failedTasks ? context.failedTasks.join(', ') : '无'}
    三件好事: ${context.goodThings ? context.goodThings.join(', ') : '无'}
    今日收获: ${context.learnings || '无'}
    挑战: ${context.challenges || '无'}
    改进点: ${context.improvements || '无'}
    心情: ${context.mood || '无'}
    精力水平: ${context.energyLevel || '无'}
    睡眠质量: ${context.sleepQuality || '无'}
    明日目标: ${context.tomorrowGoals || '无'}
    
    请根据以上信息，按照以下框架生成专业建议：
    
    1. **维度拆解**
       - 成就识别：提取3个突破性成长点（区分技能提升/认知升级/关系进化）
       - 挑战诊断：用SWOT分析法定位核心矛盾
       - 模式洞察：指出至少1个重复出现的积极/消极行为模式
    
    2. **策略建议**
       - 短期优化：提供3个可立即实施的行动项（具体动作+预期效果+实施场景）
       - 长期投资：规划1个月度能力建设项目（资源获取路径/能力验证方式）
       - 风险对冲：针对可能出现的具体挑战设计应急方案
    
    3. **认知升级**
       - 思维重构：用相关领域的经典理论重新解释当前困境
       - 杠杆识别：指出被忽视的潜在资源（人脉/数据/经验等）
       - 心智训练：推荐匹配当前阶段的认知训练方法
    
    4. **反馈校准**
       - 设置3个关键进展指标（可量化/有时限/带阈值）
       - 设计1个防倒退机制（针对已改善但易复发的问题）
       - 预判2个可能的认知偏差并给出应对策略
    
    请使用启发式追问替代直接建议，每项建议附带实施难度评级（★至★★★★★），包含1个跨领域迁移案例。`
  ];
  // 随机选择一个prompt
  const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
  return randomPrompt;
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
  // 构建习惯完成率的字符串表示
  let habitRatesString = '无相关数据';
  if (context.habitCompletionRates && Object.keys(context.habitCompletionRates).length > 0) {
    habitRatesString = Object.entries(context.habitCompletionRates)
      .map(([habit, rate]) => `${habit}: ${Math.round(rate * 100)}%`)
      .join(', ');
  }

  // 构建周目标完成情况的字符串表示
  let goalsCompletionString = '无相关数据';
  if (context.weeklyGoals && context.weeklyGoals.length > 0) {
    const completionStatus = context.weeklyGoals.map(goal => {
      const isCompleted = context.weeklyGoalsCompletion?.[goal] ?? false;
      return `${goal} [${isCompleted ? '已完成' : '未完成'}]`;
    });
    goalsCompletionString = completionStatus.join(', ');
  }

  return `
    以下是我本周(${context.startDate} 到 ${context.endDate})的日常总结：
    
    本周目标: ${context.weeklyGoals ? context.weeklyGoals.join(', ') : '无设定目标'}
    目标完成情况: ${goalsCompletionString}
    完成任务: ${context.completedTasks ? context.completedTasks.join(', ') : '无'}
    习惯完成率: ${habitRatesString}
    好事集锦: ${context.goodThings ? context.goodThings.filter(Boolean).join(', ') : '无'}
    一周收获: ${context.learnings ? context.learnings.join(', ') : '无'}
    主要挑战: ${context.challenges ? context.challenges.join(', ') : '无'}
    待改进方面: ${context.improvements ? context.improvements.join(', ') : '无'}
    存在的不足: ${context.weaknesses ? context.weaknesses.join(', ') : '无'}
    心情波动: ${context.mood ? context.mood.join(', ') : '无'}
    精力状态: ${context.energyLevel ? context.energyLevel.join(', ') : '无'}
    睡眠情况: ${context.sleepQuality ? context.sleepQuality.join(', ') : '无'}
    下周目标: ${context.nextWeekGoals ? context.nextWeekGoals.join(', ') : '无'}
    
    请根据以上信息，用三到四句话总结我这一周的整体表现，包括成就、模式、挑战和改进方向，不超过1000个字。
    请重点分析以下几个方面：
    1. 目标完成情况和习惯养成的进度
    2. 一周的主要成就和收获
    3. 存在的不足和具体改进方向，总结经验教训
    4. 心情、精力和睡眠质量对效率的影响
    5. 推荐下周计划
    
    分析一周的规律和趋势，使用客观但鼓励的语气，直接给出总结，不需要"你的总结是"这样的开头。
  `;
}
