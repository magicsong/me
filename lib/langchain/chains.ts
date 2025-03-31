import 'server-only';

import { RunnableLambda, RunnableSequence } from "@langchain/core/runnables";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { chatModel } from "./index";
import {
  summaryFeedbackPrompt,
  tagSuggestionPrompt,
  dailyPlanningPrompt,
  habitSuggestionPrompt,
  toDoAutoPlanPrompt
} from "./prompts";
import { auth } from "@/lib/auth";
import { findLLMCachedResponse, saveLLMRecordToDB } from "@/lib/db/llm";
import { createHash } from "crypto";
import { AIMessage, AIMessageChunk, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { load } from "@langchain/core/load";
import { getCurrentDateString } from '../utils';

// 创建带缓存支持的链（泛型版本）
const createCachedChain = async <T>(chainFunc: () => Promise<T>, cacheKey: string, cacheTime: number = 60): Promise<T> => {
  // 生成缓存键
  const requestHash = createHash('md5').update(cacheKey).digest('hex');

  // 检查缓存
  const cachedResult = await findLLMCachedResponse(requestHash, cacheTime);
  if (cachedResult) {
    return load(cachedResult.responseContent);
  }

  // 执行链
  const result = await chainFunc();

  // 存储结果到缓存
  const session = await auth();
  const userId = session?.user?.id;
  console.log("langchain:", result);
  await saveLLMRecordToDB(
    requestHash,
    cacheKey,
    "langchain",
    JSON.stringify(result),
    undefined,
    userId
  );

  return result;
};

export { createCachedChain };
// 生成总结反馈
export async function generateSummaryFeedback(summaryContent: string): Promise<string> {
  const chain = RunnableSequence.from([
    summaryFeedbackPrompt,
    chatModel,
  ]);
  const result = await createCachedChain(
    () => chain.invoke({ summaryContent }),
    `summary-feedback:${summaryContent}`,
    240 // 缓存4小时
  );
  // 返回消息的content字段
  return String(result.content)
}

// 标签建议解析器
const tagSuggestionParser = StructuredOutputParser.fromNamesAndDescriptions({
  tags: "建议的标签列表，以数组形式返回",
});

// 生成标签建议
export async function generateTagSuggestions(title: string, description: string = "") {
  const chain = RunnableSequence.from([
    tagSuggestionPrompt,
    chatModel,
    tagSuggestionParser,
  ]);

  const result = await createCachedChain(
    () => chain.invoke({ title, description }),
    `tag-suggestion:${title}:${description}`,
    1440 // 缓存24小时
  );

  // 解析标签（以防解析失败）
  try {
    if (typeof result === 'string') {
      return { tags: result.split(',').map(tag => tag.trim()) };
    }
    return result;
  } catch (error) {
    console.error("解析标签建议失败:", error);
    return { tags: [] };
  }
}

// 日程规划解析器
const dailyPlanningParser = StructuredOutputParser.fromNamesAndDescriptions({
  schedule: "日程安排，以数组形式返回，每个项目包含时间和活动",
  suggestions: "额外的建议，基于用户的日程情况",
});

// 生成日程规划
export async function generateDailyPlanning(todoItems: any[], habits: any[], preferences: string = "") {
  const todoItemsStr = todoItems.map(item =>
    `- ${item.title}${item.priority ? ` (优先级: ${item.priority})` : ''}`
  ).join("\n");

  const habitsStr = habits.map(habit =>
    `- ${habit.name}${habit.completedToday ? ' (今日已完成)' : ''}`
  ).join("\n");

  const chain = RunnableSequence.from([
    dailyPlanningPrompt,
    chatModel,
    dailyPlanningParser,
  ]);

  // 每天生成新的规划，所以添加日期到缓存键
  const today = new Date().toISOString().split('T')[0];

  return createCachedChain(
    () => chain.invoke({ todoItems: todoItemsStr, habits: habitsStr, preferences }),
    `daily-planning:${today}:${todoItems.length}:${habits.length}`,
    720 // 缓存12小时
  );
}

// 习惯建议解析器
const habitSuggestionParser = StructuredOutputParser.fromNamesAndDescriptions({
  currentHabitsSuggestions: "对现有习惯的建议",
  newHabitsSuggestions: "新习惯的建议",
});

// 生成习惯建议
export async function generateHabitSuggestions(userHabits: any[], completionStats: any) {
  const habitsStr = userHabits.map(habit =>
    `- ${habit.name} (完成率: ${habit.completionRate || '未知'}, 连续天数: ${habit.streak || 0})`
  ).join("\n");

  const statsStr = `总体完成率: ${completionStats.overallCompletionRate || 0}
最佳习惯: ${completionStats.bestHabit?.name || '无'}
需要加强: ${completionStats.worstHabit?.name || '无'}`;

  const chain = RunnableSequence.from([
    habitSuggestionPrompt,
    chatModel,
    habitSuggestionParser,
  ]);

  // 每周更新一次习惯建议
  const weekNumber = getWeekNumber(new Date());

  return createCachedChain(
    () => chain.invoke({ userHabits: habitsStr, completionStats: statsStr }),
    `habit-suggestion:${weekNumber}:${userHabits.length}`,
    10080 // 缓存7天
  );
}

// 生成ToDo项计划的chain
export async function generateTodoItemsPlan(prompt: string): Promise<any[]> {
  try {
    // 提取任务描述和示例输出
    const descriptionMatch = prompt.match(/任务描述：([\s\S]*?)(?=请将结果格式化为可解析的JSON数组)/);
    const exampleMatch = prompt.match(/示例输出格式：([\s\S]*?)(?=请根据任务的逻辑顺序)/);

    // 解析当前时间信息
    const currentTimeStr = getCurrentDateString()
    const description = descriptionMatch ? descriptionMatch[1].trim() : prompt;
    const EXAMPLE_OUTPUT = exampleMatch ? exampleMatch[1].trim() : '';

    // 创建一个专门用于解析Todo项目的解析器
    const todoItemsParser = RunnableLambda.from(
      (text: AIMessage) => {
        const content = text.content.toString();
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]) as any[];
        }

        try {
          return JSON.parse(content) as any[];
        } catch (e) {
          console.error("无法解析LLM响应为JSON", content);
          throw new Error("生成的任务计划格式不正确");
        }
      }
    );

    // 使用RunnableSequence创建处理链
    const chain = RunnableSequence.from([
      toDoAutoPlanPrompt,
      chatModel,
      todoItemsParser,
    ]);

    // 创建缓存键 - 使用描述的哈希值和日期
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `todo-autoplan:${today}:${description}`;

    // 使用createCachedChain进行缓存处理
    return createCachedChain(
      () => chain.invoke({ description: description, currentTime: currentTimeStr, EXAMPLE_OUTPUT: EXAMPLE_OUTPUT }),
      cacheKey,
      360 // 缓存6小时
    );
  } catch (error) {
    console.error("生成待办事项计划失败:", error);
    throw error;
  }
}

// 辅助函数：获取当前是一年中的第几周
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}
