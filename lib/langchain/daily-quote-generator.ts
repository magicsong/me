
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
        // 创建多个风格不同的提示模板，增加多样性
        const prompts = [
            `你是一个格言推荐助手。请为用户推荐一句有深度、有启发的格言，中英文不限，如果是英文给上最好的中文翻译。
            
            要求：
            1. 可以是历史名人名言、文学作品、电影台词或创意原创格言
            2. 格言应当简洁有力，富有哲理或激励意义，或者引发人思考
            3. 优先选择关于以下主题之一的格言：成长、坚持、幽默、智慧、勇气、平衡、感恩、专注、创新、梦想
            
            日期: {date}
            
            请输出JSON格式，包含以下字段:
            - quote: 格言内容
            - author: 作者或来源（格式：姓名 或 姓名(来源)，如果是原创可填"AI原创"）
            - theme: 格言所属的主题`,
            
            `你是一个创意灵感提供者。请提供一句用来启发人们新的思考方式和行动的格言。这句话应该有一定的反直觉或出人意料的角度。
            
            要求：
            1. 格言可来自真实名人、文学、电影或创意原创
            2. 选择那些含有"反转"思维或非传统观点的格言
            3. 可以是关于失败、不完美、矛盾或非常规思想的内容
            4. 应该能够激发思考或挑战常见的观点
            5. 简洁但富有张力
            
            日期: {date}
            
            请输出JSON格式，包含以下字段:
            - quote: 格言内容
            - author: 作者或来源（格式：姓名 或 姓名(来源)，如果是原创可填"AI原创"）
            - theme: 格言所属的主题`,
            
            `你是一个智慧收集者。请提供一句简洁深刻的格言，能在日常生活中实际应用。
            
            要求：
            1. 格言可来自历史名人、现代思想家、文学作品或创意原创
            2. 选择那些看似简单但蕴含深层智慧的内容
            3. 最好是可以在生活、工作或人际关系中实际指导行动的格言
            4. 避免过于抽象或难以理解的哲学观点
            5. 可以是幽默的、讽刺的或犀利的观点
            
            日期: {date}
            
            请输出JSON格式，包含以下字段:
            - quote: 格言内容
            - author: 作者或来源（格式：姓名 或 姓名(来源)，如果是原创可填"AI原创"）
            - theme: 格言所属的主题`,
            
            `你是一个灵感搜索引擎。请提供一句用来激励和引发创意思考的格言。这句话应该有意思、有启发性，且不太常见。
            
            要求：
            1. 格言可来自名人、文学、电影、现代创意思想或完全原创
            2. 选择那些不是很常见但值得深思的内容
            3. 优先考虑与创意、变革、冒险相关的主题
            4. 可以包含对人性、社会或人生的独特见解
            5. 字数简短，但含义丰富
            
            日期: {date}
            
            请输出JSON格式，包含以下字段:
            - quote: 格言内容
            - author: 作者或来源（格式：姓名 或 姓名(来源)，如果是原创可填"AI原创"）
            - theme: 格言所属的主题`
        ];
        
        // 随机选择一个 prompt
        const selectedPrompt = prompts[Math.floor(Math.random() * prompts.length)];
        const promptTemplate = PromptTemplate.fromTemplate(selectedPrompt);
        
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
