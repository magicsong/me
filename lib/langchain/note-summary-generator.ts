import { PromptTemplate } from "@langchain/core/prompts";
import { chatModel, createCachedChain } from ".";
import { trimLLMContentToJsonObject } from "../utils";

type NoteSummaryResult = {
  summary: string;
  reason: string;
  keyPoints?: string[];
};

/**
 * 生成笔记 AI 摘要和推荐理由
 * @param noteId 笔记ID
 * @param title 笔记标题
 * @param content 笔记内容
 * @param userId 用户ID (可选，用于缓存)
 * @returns 包含摘要、推荐理由和关键点的对象
 */
export async function generateNoteSummary(
  noteId: number | string,
  title: string,
  content: string,
  userId?: string
): Promise<NoteSummaryResult> {
  try {
    // 构建提示模板
    const promptTemplate = PromptTemplate.fromTemplate(`
      你是一个专业的笔记分析和摘要生成器。请分析以下笔记内容，生成简洁的摘要和推荐理由。
      
      笔记标题: {title}
      
      笔记内容:
      {content}
      
      请输出JSON格式，包含以下字段:
      - summary: 笔记的简要摘要（不超过100字）
      - reason: 为什么这条笔记值得回顾（推荐理由，不超过80字）
      - keyPoints: 3-5个关键要点（数组格式）
      
      请确保输出为有效的JSON格式。
    `);

    const prompt = await promptTemplate.format({ 
      title: title || '无标题',
      content: content || '无内容' 
    });

    const cacheKey = `note-summary:${noteId}:${userId || 'anonymous'}`;
    const response = await createCachedChain(
      () => chatModel.invoke(prompt), 
      cacheKey,
      3600  // 缓存1小时
    );

    try {
      // 尝试解析JSON响应
      const parsedResponse = JSON.parse(trimLLMContentToJsonObject(response.content.toString()));
      return {
        summary: parsedResponse.summary || '',
        reason: parsedResponse.reason || '',
        keyPoints: Array.isArray(parsedResponse.keyPoints) ? parsedResponse.keyPoints : []
      };
    } catch (parseError) {
      // 如果解析失败，返回原始内容作为摘要
      console.warn('Failed to parse note summary AI response as JSON:', parseError);
      const responseText = response.content.toString();
      return {
        summary: responseText.length > 100 ? responseText.slice(0, 100) + '...' : responseText,
        reason: `这条笔记包含关于"${title}"的重要内容，值得保存和回顾。`,
        keyPoints: []
      };
    }
  } catch (error) {
    console.error('生成笔记摘要失败:', error);
    throw error;
  }
}
