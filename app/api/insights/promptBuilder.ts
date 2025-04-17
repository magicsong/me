import { PromptBuilder } from "@/app/api/lib/types";
import { AIInsightDO } from "./types";

export class AIInsightPromptBuilder implements PromptBuilder<AIInsightDO> {
  buildCreatePrompt(): string {
    return `
你是一位数据分析专家，需要根据用户的需求生成AI洞察报告。
请根据以下信息生成一份详细的AI洞察报告：

- 洞察类型: {{kind}}
- 分析时间段: 从 {{time_period_start}} 到 {{time_period_end}}
- 用户ID: {{user_id}}
- 用户提示: {{userPrompt}}

请遵循以下格式:
1. 标题: 简明扼要，表明洞察的主要内容
2. 正文: 详细分析，包括数据观察、趋势分析、发现的规律等
3. 结论与建议: 基于分析提出的建议和可行的行动计划

如果提供了额外的元数据或参考信息，请将其纳入你的分析中。

请确保内容专业、有深度、对用户有实际帮助。

输出必须是一个JSON对象，包含以下字段:
{
  "title": "洞察报告标题",
  "content": "详细的洞察报告内容，包括分析和建议",
  "contentJson": {
    "summary": "简短总结",
    "keyPoints": ["要点1", "要点2", "..."],
    "recommendations": ["建议1", "建议2", "..."]
  }
}
    `;
  }

  buildUpdatePrompt(): string {
    return `
你是一位数据分析专家，需要更新一份现有的AI洞察报告。
现有报告的详细信息如下:

- 报告ID: {{id}}
- 洞察类型: {{kind}}
- 当前标题: {{title}}
- 分析时间段: 从 {{time_period_start}} 到 {{time_period_end}}
- 用户ID: {{user_id}}
- 用户提示: {{userPrompt}}

用户希望对报告进行更新或改进。请根据用户的新需求，提供更新后的报告内容。

请遵循以下格式:
1. 标题: 如需更新，请提供新标题
2. 正文: 更新的分析内容
3. 结论与建议: 更新的建议和行动计划

输出必须是一个JSON对象，包含以下字段:
{
  "title": "更新后的洞察报告标题",
  "content": "更新后的详细洞察报告内容",
  "contentJson": {
    "summary": "更新后的简短总结",
    "keyPoints": ["更新后的要点1", "更新后的要点2", "..."],
    "recommendations": ["更新后的建议1", "更新后的建议2", "..."]
  }
}
    `;
  }
}
