import { ChatOpenAI } from "@langchain/openai";
import { OpenAI } from "openai";

// 初始化LangChain OpenAI模型
export const chatModel = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
  temperature: 0.7,
  configuration:{
    baseURL: process.env.OPENAI_URL,
  }
});

// 原始OpenAI客户端(非LangChain)，用于某些特定功能
export const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_URL,
});

// 加载AI助手配置
export const ASSISTANT_CONFIG = {
  name: "ME助手",
  description: "您的个人生活和工作助手",
  enabledByDefault: true,
  features: {
    summarizeFeedback: true,
    tagSuggestion: true,
    dailyPlanning: true,
    habitSuggestion: true,
  }
};

// 导出
export * from "./chains";
export * from "./prompts";
