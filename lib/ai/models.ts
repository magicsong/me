import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

export const DEFAULT_CHAT_MODEL: string = 'chat-model';

interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'chat-model',
    name: 'Chat model',
    description: 'Primary model for all-purpose chat',
  },
  {
    id: 'chat-model-reasoning',
    name: 'Reasoning model',
    description: 'Uses advanced reasoning',
  },
];


// 从逗号分隔的模型列表中随机选择一个模型
function getRandomModel(): string {
  const models = (process.env.OPENAI_MODELS || "gpt-3.5-turbo").split(",").map(m => m.trim());
  return models[Math.floor(Math.random() * models.length)];
}

export const defaultModel = createOpenAICompatible({
  baseURL: process.env.OPENAI_URL ? process.env.OPENAI_URL : 'https://api.openai.com/v1',
  name: 'myllm',
  apiKey: process.env.OPENAI_API_KEY,
}).chatModel(getRandomModel())