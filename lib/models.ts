import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";

const model = createOpenAICompatible({
  baseURL: process.env.OPENAI_URL ? process.env.OPENAI_URL : 'https://api.openai.com/v1',
  name: 'myllm',
  apiKey: process.env.OPENAI_API_KEY,
}).chatModel(process.env.OPENAI_MODEL ? process.env.OPENAI_MODEL : 'gpt-3.5-turbo')


// custom provider with different model settings:
export const myProvider = customProvider({
  languageModels: {
    "deepseek-r1": wrapLanguageModel({
      middleware: extractReasoningMiddleware({
        tagName: "think",
      }),
      model: model,
    })
    // "deepseek-r1-distill-llama-70b": wrapLanguageModel({
    //   middleware: extractReasoningMiddleware({
    //     tagName: "think",
    //   }),
    //   model: groq("deepseek-r1-distill-llama-70b"),
    // }),
  },
});

export type modelID = Parameters<(typeof myProvider)["languageModel"]>["0"];

export const models: Record<modelID, string> = {
  "deepseek-r1": "DeepSeek-R1",
};
