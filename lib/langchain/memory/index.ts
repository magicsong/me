import { db } from "@/lib/db";
import { PostgresChatMessageHistory } from "@langchain/community/stores/message/postgres";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { ConversationChain } from "langchain/chains";
import { BufferWindowMemory, ConversationSummaryBufferMemory } from "langchain/memory";

// 构造参数支持 pool 或 poolConfig、sessionId 和可选 tableName
const chatHistory = new PostgresChatMessageHistory({
    sessionId: "my-session",
    pool: db,
    tableName: "chat_histories",
});

interface MemoryParams {
    memoryType?: "buffer" | "window" | "summary";
    returnMessages?: boolean;
    windowSize?: number;
    maxTokenLimit?: number;
    memoryKey?: string;
}

interface GenerateOptions {
    userId: string;
    sessionId: string;
    input: string;
    memoryParams?: MemoryParams;
}

// 核心接口
export async function generateContent(opts: GenerateOptions): Promise<string> {
    const { sessionId, input, memoryParams } = opts;
    // 选择内存策略
    let memory;
    switch (memoryParams?.memoryType) {
        case "window":
            memory = new BufferWindowMemory({
                chatHistory: chatHistory,
                k: memoryParams.windowSize ?? 5,
                returnMessages: memoryParams.returnMessages,
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
        llm: new ChatOpenAI({ temperature: 0.7 }),
        memory,
        prompt: ChatPromptTemplate.fromMessages([
            new MessagesPlaceholder(memoryParams?.memoryKey ?? "chat_history"),
            ["human", "{input}"],
        ]),
    });

    const res = await chain.call({ input });
    return res.response;
}
