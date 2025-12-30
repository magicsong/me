// AI 问题生成逻辑
import { AIQuestionMode, AIQuestion } from './types';

// 随机反问 - 质疑解决方式
const counterQuestions = [
  "你后来真的解决这个问题了吗，还是只是习惯了？",
  "如果现在又遇到这个情况，你还会以同样的方式处理吗？",
  "这个\"解决方案\"真的有效，还是你只是停止思考了？",
  "你记得当时为什么选择这个方式吗？",
  "如果朋友告诉你同样的烦恼，你会给他什么建议？",
];

// 对比模式 - 反问自己的成长
const contrastQuestions = [
  "现在的你，会给当时的你什么反建议？",
  "比起那时的想法，你改变了吗？改变的理由是什么？",
  "当时觉得最重要的事，现在还重要吗？",
  "你是真的成长了，还是只是换了个角度逃避？",
  "如果用现在的标准评价当时的你，你会说什么？",
];

// 误读模式 - 从他人视角审视
const misreadQuestions = [
  "如果这是别人写的，你会觉得他卡在哪里？",
  "这段笔记里，哪句话最容易被误解？",
  "如果你是心理医生，这条笔记透露了什么信号？",
  "这里面有没有什么是你在欺骗自己的？",
  "从局外人的角度，这段话的真实问题是什么？",
];

// 风险模式 - 指出隐藏的盲点
const riskQuestions = [
  "这条笔记里隐藏的最大风险不是你写的内容，而是你没写的部分。",
  "你在这里故意避开了什么话题吗？",
  "这个想法的反面是什么，你考虑过吗？",
  "如果这个假设是错的，最坏的情况会怎样？",
  "你为什么没有提到那个更深层的原因？",
];

const modes: AIQuestionMode[] = ['counterquestion', 'contrast', 'misread', 'risk'];

export function generateDailyAIQuestion(seed: number): AIQuestion {
  // 基于日期 seed，确保每天只有一种类型的问题（但不同用户可能不同）
  const modeIndex = seed % modes.length;
  const mode = modes[modeIndex];

  let questions: string[] = [];
  switch (mode) {
    case 'counterquestion':
      questions = counterQuestions;
      break;
    case 'contrast':
      questions = contrastQuestions;
      break;
    case 'misread':
      questions = misreadQuestions;
      break;
    case 'risk':
      questions = riskQuestions;
      break;
  }

  // 根据 seed 选择问题
  const questionIndex = Math.floor(seed / modes.length) % questions.length;
  const question = questions[questionIndex];

  return {
    mode,
    question,
  };
}

// 根据日期和用户 ID 生成种子，确保稳定的每日随机性
export function generateDailySeed(userId: string, date?: Date): number {
  const d = date || new Date();
  const dateStr = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  const seed = dateStr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const userSeed = userId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return seed + userSeed;
}
