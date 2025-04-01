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


export const defaultModel = createOpenAICompatible({
  baseURL: process.env.OPENAI_URL ? process.env.OPENAI_URL : 'https://api.openai.com/v1',
  name: 'myllm',
  apiKey: process.env.OPENAI_API_KEY,
}).chatModel(process.env.OPENAI_MODEL ? process.env.OPENAI_MODEL : 'gpt-3.5-turbo')