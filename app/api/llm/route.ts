"use server"

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createHash } from 'crypto';
import { saveLLMRecordToDB, findLLMCachedResponse } from '@/lib/db/llm';

// 初始化OpenAI客户端
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_URL
});

// 支持原生Think功能的模型列表
const NATIVE_THINKING_MODELS = [
    'deepseek-chat',
    'deepseek-coder',
    'deepseek-v2',
    "deepseek"
];

interface LLMRequest {
    prompt: string;
    enableThinking?: boolean;
    temperature?: number;
    maxTokens?: number;
    model?: string;
    cacheTimeMinutes?: number; // 缓存时间（分钟）
}

interface LLMResponse {
    content: string;
    thinking?: string;
    fromCache?: boolean; // 标记响应是否来自缓存
}

// 生成请求的唯一哈希值
function generateRequestHash(prompt: string, model: string): string {
    return createHash('md5').update(`${prompt}:${model}`).digest('hex');
}

// 格式化时间显示，如"2分钟前"
function formatTimeAgo(timestamp: Date): string {
    const seconds = Math.floor((Date.now() - timestamp.getTime()) / 1000);
    
    const intervals = {
        年: 31536000,
        月: 2592000,
        周: 604800,
        天: 86400,
        小时: 3600,
        分钟: 60,
        秒: 1
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}前`;
        }
    }
    
    return '刚刚';
}

export async function POST(request: Request) {
    try {
        const body: LLMRequest = await request.json();
        const {
            prompt,
            enableThinking = false,
            temperature = 0.7,
            maxTokens = 1000,
            model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
            cacheTimeMinutes = 60 // 默认缓存60分钟
        } = body;

        if (!prompt) {
            return NextResponse.json(
                { error: '缺少必要的prompt参数' },
                { status: 400 }
            );
        }

        // 生成请求哈希值用于缓存查询
        const requestHash = generateRequestHash(prompt, model);
        
        // 查询缓存
        const cachedRecord = await findLLMCachedResponse(requestHash, cacheTimeMinutes);
        
        if (cachedRecord) {
            // 找到有效缓存，直接返回
            console.log(`从缓存中获取结果，缓存时间: ${formatTimeAgo(cachedRecord.createdAt)}`);
            return NextResponse.json({
                content: cachedRecord.responseContent,
                thinking: cachedRecord.responseThinking,
                fromCache: true
            });
        }

        // 没有缓存，调用OpenAI API
        const response: LLMResponse = await callOpenAI(
            prompt,
            enableThinking,
            temperature,
            maxTokens,
            model
        );
        console.log('API调用结果:', response);
        // 保存调用结果到数据库
        await saveLLMRecordToDB(
            requestHash,
            prompt,
            model,
            response.content,
            response.thinking

            // TODO: 如果有用户系统，这里可以添加userId
        );
        
        console.log('LLM调用结果已保存到数据库，缓存时间设置为', cacheTimeMinutes, '分钟');

        return NextResponse.json(response);
    } catch (error) {
        console.error('LLM API错误:', error);
        return NextResponse.json(
            { error: '处理请求时发生错误' },
            { status: 500 }
        );
    }
}

// 使用OpenAI API进行调用
async function callOpenAI(
    prompt: string,
    enableThinking: boolean,
    temperature: number,
    maxTokens: number,
    model: string
): Promise<LLMResponse> {
    // 检查模型是否原生支持思考功能
    const supportsNativeThinking = NATIVE_THINKING_MODELS.some(
        supportedModel => model.toLowerCase().includes(supportedModel)
    );
    
    // 构建完整的提示内容
    let fullPrompt = prompt;
    let systemPrompt = "你是一个有帮助的助手。给出简洁清晰的回答。";

    // 只有在需要思考且模型不支持原生思考时才修改提示
    if (enableThinking && !supportsNativeThinking) {
        // 对不支持原生思考的模型使用特殊提示格式
        fullPrompt = `${prompt}\n\n请在回答前用《Think》标记包含你的思考过程，然后用《Answer》标记你的最终回答。`;
        systemPrompt = "你是一个有帮助的助手。在回答问题时，先在《Think》标签内详细思考问题，然后在《Answer》标签内给出简洁清晰的回答。";
    }

    try {
        const chatCompletion = await openai.chat.completions.create({
            model: model,
            temperature: temperature,
            max_tokens: maxTokens,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: fullPrompt }
            ],
        });

        const responseText = chatCompletion.choices[0]?.message?.content || "";
        if (enableThinking) {
            if (supportsNativeThinking) {
                // DeepSeek模型原生支持思考过程，直接从响应中提取
                if (chatCompletion.choices[0]?.message?.thinking) {
                    // 如果API直接返回thinking字段
                    return {
                        content: responseText,
                        thinking: chatCompletion.choices[0].message.thinking as string
                    };
                }
            } else {
                // 对于不支持原生思考的模型，从文本中提取思考和回答部分
                const thinkMatch = responseText.match(/《Think》([\s\S]*?)《Answer》/);
                const thinking = thinkMatch ? thinkMatch[1].trim() : "";

                const answerMatch = responseText.match(/《Answer》([\s\S]*)/);
                const answer = answerMatch ? answerMatch[1].trim() : responseText;

                return { content: answer, thinking };
            }
        }

        return { content: responseText };
    } catch (error) {
        console.error("OpenAI API调用失败:", error);
        return {
            content: "抱歉，处理您的请求时遇到了问题。",
            thinking: enableThinking ? "API调用出错" : undefined
        };
    }
}