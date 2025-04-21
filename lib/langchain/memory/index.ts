import { PostgresChatMessageHistory } from "@langchain/community/stores/message/postgres";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { ConversationChain } from "langchain/chains";
import { BufferWindowMemory, ConversationSummaryBufferMemory } from "langchain/memory";
import { chatModel } from "..";
import { Pool } from "pg";

const pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
});


export interface MemoryParams {
    memoryType?: "buffer" | "window" | "summary";
    returnMessages?: boolean;
    windowSize?: number;
    maxTokenLimit?: number;
    memoryKey?: string;
}

export interface GenerateOptions {
    userId: string;
    sessionId: string;
    input: string;
    memoryParams?: MemoryParams;
}

// 核心接口
export async function generateContent(opts: GenerateOptions): Promise<string> {
    const { sessionId, input, memoryParams } = opts;
    // 构造参数支持 pool 或 poolConfig、sessionId 和可选 tableName
    const chatHistory = new PostgresChatMessageHistory({
        sessionId: sessionId,
        pool: pool,
        tableName: "chat_histories",
    });
    // 选择内存策略
    let memory;
    switch (memoryParams?.memoryType) {
        case "window":
            memory = new BufferWindowMemory({
                chatHistory: chatHistory,
                k: memoryParams.windowSize ?? 5,
                returnMessages: memoryParams.returnMessages,
                memoryKey: "chat_history",
            });
            break;
        case "summary":
            memory = new ConversationSummaryBufferMemory({
                llm: new ChatOpenAI({ temperature: 0 }),
                maxTokenLimit: memoryParams.maxTokenLimit ?? 1000,
                returnMessages: memoryParams.returnMessages,
            });
            break;
        default:
            memory = new BufferWindowMemory({
                chatHistory: chatHistory,
                memoryKey: memoryParams.memoryKey ?? "chat_history",
                returnMessages: memoryParams.returnMessages,
            });
    }

    // 构建链并生成
    const chain = new ConversationChain({
        llm: chatModel,
        memory,
        prompt: ChatPromptTemplate.fromMessages([
            new MessagesPlaceholder(memoryParams?.memoryKey ?? "chat_history"),
            ["human", "{input}"],
        ]),
    });

    const res = await chain.call({ input });
    return res.response;
}
