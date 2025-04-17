import { OutputParser } from "@/app/api/lib/types";
import { AIInsightDO } from "./types";

export class AIInsightOutputParser implements OutputParser<AIInsightDO> {
  parseCreateOutput(output: string): Partial<AIInsightDO> {
    try {
      // 尝试解析JSON输出
      const parsed = JSON.parse(output);
      
      return {
        title: parsed.title,
        content: parsed.content,
        content_json: parsed.contentJson || {}
      };
    } catch (error) {
      console.error('解析LLM输出失败:', error);
      
      // 如果JSON解析失败，尝试简单提取标题和内容
      let title = "AI洞察报告";
      let content = output;
      
      // 尝试提取标题（假设标题在第一行）
      const lines = output.split('\n').filter(line => line.trim());
      if (lines.length > 0) {
        title = lines[0].replace(/^#+ /, ''); // 移除可能的Markdown标题标记
        content = lines.slice(1).join('\n');
      }
      
      return {
        title,
        content,
        content_json: { rawOutput: output }
      };
    }
  }

  parseUpdateOutput(output: string, existingData: AIInsightDO): Partial<AIInsightDO> {
    try {
      // 尝试解析JSON输出
      const parsed = JSON.parse(output);
      
      return {
        title: parsed.title || existingData.title,
        content: parsed.content || existingData.content,
        content_json: parsed.contentJson || existingData.content_json,
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('解析LLM输出失败:', error);
      
      // 如果JSON解析失败，使用整个输出作为内容，保持标题不变
      return {
        content: output,
        content_json: { 
          ...existingData.content_json,
          updatedRawOutput: output 
        },
        updated_at: new Date().toISOString()
      };
    }
  }
}
