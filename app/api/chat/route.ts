import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { streamText } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const model = createOpenAICompatible({
    baseURL: process.env.OPENAI_URL ? process.env.OPENAI_URL : 'https://api.openai.com/v1',
    name: 'myllm',
    apiKey: process.env.OPENAI_API_KEY,
}).chatModel(process.env.OPENAI_MODEL ? process.env.OPENAI_MODEL : 'gpt-3.5-turbo')

export async function POST(req: Request) {
    const { messages } = await req.json();

    const result = streamText({
        model: model,
        messages,
    });

    return result.toDataStreamResponse();
}