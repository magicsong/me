
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
            你是一个格言推荐助手。请从历史上真实存在的名人名言中选择一句，为用户推荐一句有深度、有启发的名言，中英文不限，如果是英文给上最好的中文翻译。
            
            要求：
            1. 必须是真实历史人物说过或写过的名言，不可编造或虚构
            2. 可以是中文名人或翻译的外国名人名言
            3. 格言应当简洁有力，富有哲理或激励意义，或者引发人思考就可以
            4. 优先选择关于以下主题之一的名言：成长、坚持、幽默、智慧、勇气、平衡、感恩、专注、创新、梦想
            
            日期: {date}
            
            请输出JSON格式，包含以下字段:
            - quote: 格言内容（必须是真实存在的名言）
            - author: 作者的真实姓名（格式：中文名 或 中文名(英文名)）
            - theme: 格言所属的主题
        `);
        
        const prompt = await promptTemplate.format({ date: dateStr });
        const response = await createCachedChain(() => chatModel.invoke(prompt), `daily-quote:${dateStr}:${userId}`,240);
        
        try {
            // 尝试解析JSON响应
            const parsedResponse = JSON.parse(trimLLMContentToJsonObject(response.content.toString()));
            return {
                quote: parsedResponse.quote,
                author: parsedResponse.author || '真实名人',
                theme: parsedResponse.theme
            };
        } catch (parseError) {
            // 如果解析失败，则将整个回复作为格言返回
            console.warn('Failed to parse AI response as JSON:', parseError);
            return {
                quote: response.content.toString(),
                author: '真实名人',
                theme: '未指定'
            };
        }
    } catch (error) {
        console.error('生成每日格言失败:', error);
        throw error;
    }
}
