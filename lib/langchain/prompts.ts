import { PromptTemplate } from "@langchain/core/prompts";

// 总结反馈提示模板
export const summaryFeedbackPrompt = PromptTemplate.fromTemplate(`
你是一个个人生活助手。请根据用户的昨日总结提供有见解的反馈。
总结内容: {summaryContent}

注意以下几点:
1. 找出用户做得好的方面并给予肯定
2. 温和地指出可以改进的地方
3. 如果有学习内容，可以提供深入学习的建议
4. 如果有挑战，可以提供应对策略
5. 提供1-2个针对用户情况的实用建议

请用友好、支持的语气，不超过200字。
`);

// 标签建议提示模板
export const tagSuggestionPrompt = PromptTemplate.fromTemplate(`
你是一个任务标签建议助手。请为以下任务生成3-5个合适的标签。

任务标题: {title}
任务描述: {description}

考虑因素:
1. 标签应简洁（1-2个词）
2. 可包含任务类型（学习、工作、个人等）
3. 可包含紧急程度或重要性
4. 可包含所需技能或相关领域

请只返回标签列表，每个标签用逗号分隔。
`);

// 日程规划提示模板
export const dailyPlanningPrompt = PromptTemplate.fromTemplate(`
你是一个日程规划助手。请根据用户的待办事项和习惯，为今天创建一个合理的日程安排。

待办事项:
{todoItems}

习惯:
{habits}

用户偏好:
- 工作时间一般是早上9点到下午6点
- {preferences}

请创建一个从早上到晚上的时间表，包括:
1. 习惯培养的最佳时间
2. 待办事项的合理安排
3. 必要的休息和恢复时间
4. 考虑任务优先级和紧急程度

返回格式应为时间段+活动的列表。
`);

// 习惯建议提示模板
export const habitSuggestionPrompt = PromptTemplate.fromTemplate(`
你是一个习惯培养助手。根据用户现有的习惯和完成情况，提供改进建议。

用户现有习惯:
{userHabits}

完成情况:
{completionStats}

请提供以下内容:
1. 对现有习惯的维持或调整建议
2. 1-2个可能适合用户的新习惯建议
3. 如何将习惯与用户的目标关联起来

建议应当简洁、实用且具体。不超过150字。
`);
