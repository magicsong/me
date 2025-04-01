
import { PromptTemplate } from "@langchain/core/prompts";
import { chatModel, createCachedChain } from ".";
import { trimLLMContentToJsonObject } from "../utils";
type DailyQuoteResult = {
    quote: string;
    author?: string;
    theme?: string;
};

/**
 * 生成每日格言
 * @param dateStr 日期字符串
 * @param userId 用户ID
 * @returns 包含格言内容和元数据的对象
 */
export async function generateDailyQuote(dateStr: string, userId: string): Promise<DailyQuoteResult> {
    try {
        
        // 构建提示模板
        const promptTemplate = PromptTemplate.fromTemplate(`
            你是一个富有智慧的格言生成器。请为用户生成一句富有哲理、能够激励人心或者幽默风趣的格言。
            格言应当简洁有力，富有深度，能够引发思考。
            可以基于以下主题之一（随机选择）：成长、坚持、幽默、智慧、勇气、平衡、感恩、专注。
            
            日期: {date}
            
            请输出JSON格式，包含以下字段:
            - quote: 格言内容
            - author: 作者或来源（如果是你原创的，标记为"AI原创"）
            - theme: 格言的主题
        `);
        
        const prompt = await promptTemplate.format({ date: dateStr });
        const response = await createCachedChain(() => chatModel.invoke(prompt), `daily-quote:${dateStr}:${userId}`,240);
        
        try {
            // 尝试解析JSON响应
            const parsedResponse = JSON.parse(trimLLMContentToJsonObject(response.content.toString()));
            return {
                quote: parsedResponse.quote,
                author: parsedResponse.author,
                theme: parsedResponse.theme
            };
        } catch (parseError) {
            // 如果解析失败，则将整个回复作为格言返回
            console.warn('Failed to parse AI response as JSON:', parseError);
            return {
                quote: response.content.toString(),
                author: 'AI原创',
                theme: '未指定'
            };
        }
    } catch (error) {
        console.error('生成每日格言失败:', error);
        throw error;
    }
}
