/**
 * 意外之镜 - AI 反问生成器（后端版本）
 * 根据笔记内容和用户信息，使用大模型生成有深度的反问
 */

import { PromptTemplate } from "@langchain/core/prompts";
import { chatModel } from ".";

export type AIQuestionMode = 'counterquestion' | 'contrast' | 'misread' | 'risk';

export interface AIQuestion {
  mode: AIQuestionMode;
  question: string;
}

/**
 * 根据笔记内容生成 AI 反问
 * @param noteContent 笔记内容
 * @param noteTitle 笔记标题
 * @param userId 用户ID（用于确定反问模式）
 * @returns AI 反问对象
 */
export async function generateMirrorQuestion(
  noteContent: string,
  noteTitle: string,
  userId: string
): Promise<AIQuestion> {
  // 根据用户ID和日期确定反问模式
  const mode = selectQuestionMode(userId);

  // 根据模式生成相应的提示词
  const prompt = buildPrompt(noteContent, noteTitle, mode);

  // 调用大模型生成反问
  let question: string;
  try {
    const promptTemplate = PromptTemplate.fromTemplate(prompt);
    const chain = promptTemplate.pipe(chatModel);
    
    const response = await chain.invoke({});
    question = typeof response.content === 'string' ? response.content : String(response.content);
  } catch (error) {
    console.error('Failed to generate mirror question:', error);
    // 降级方案：返回通用反问
    question = getDefaultQuestion(mode);
  }

  return {
    mode,
    question: question.trim(),
  };
}

/**
 * 根据用户ID选择反问模式
 * 确保每天同一用户看到相同的模式，但不同用户可能不同
 */
function selectQuestionMode(userId: string): AIQuestionMode {
  const modes: AIQuestionMode[] = ['counterquestion', 'contrast', 'misread', 'risk'];
  
  // 生成种子：基于用户ID和当前日期
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  const combinedStr = `${userId}:${dateStr}`;
  
  // 简单哈希
  let hash = 0;
  for (let i = 0; i < combinedStr.length; i++) {
    hash = ((hash << 5) - hash) + combinedStr.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  
  const index = Math.abs(hash) % modes.length;
  return modes[index];
}

/**
 * 根据模式构建提示词
 */
function buildPrompt(noteContent: string, noteTitle: string, mode: AIQuestionMode): string {
  const baseContext = `
用户的笔记标题：《${noteTitle}》
笔记内容：
${noteContent}

请基于以下模式，用第二人称向用户提出一个深入的、发人深省的反问。`;

  const modeInstructions: Record<AIQuestionMode, string> = {
    counterquestion: `
模式：反问模式 - 质疑解决方式
你需要问一个问题来让用户反思：他/她是否真的解决了问题，还是只是习惯了。或者问他/她现在会如何处理相同的情况。
生成一个简洁的反问句，长度在15-30字之间。`,

    contrast: `
模式：对比模式 - 反问成长
你需要问一个问题来让用户对比当时和现在的自己。问他/她是否真的成长了，或者只是改变了角度。
生成一个简洁的反问句，长度在15-30字之间。`,

    misread: `
模式：误读模式 - 从他人视角审视
你需要问一个问题，从心理医生或局外人的角度分析这条笔记。问什么样的信号或隐藏的真相可能在这里面。
生成一个简洁的反问句，长度在15-30字之间。`,

    risk: `
模式：风险模式 - 指出隐藏的盲点
你需要问一个问题来揭示这条笔记中隐藏的风险或用户没有考虑的反面情况。
生成一个简洁的反问句，长度在15-30字之间。`,
  };

  return baseContext + '\n' + modeInstructions[mode] + '\n\n请只输出反问句，不要添加任何其他文字。';
}

/**
 * 降级方案：返回预设的默认反问
 */
function getDefaultQuestion(mode: AIQuestionMode): string {
  const defaults: Record<AIQuestionMode, string> = {
    counterquestion: '你后来真的解决这个问题了吗，还是只是习惯了？',
    contrast: '现在的你，会给当时的你什么反建议？',
    misread: '如果这是别人写的，你会觉得他卡在哪里？',
    risk: '这条笔记里隐藏的最大风险是什么？',
  };
  return defaults[mode];
}
