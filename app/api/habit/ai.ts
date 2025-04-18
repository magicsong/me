import { PromptBuilder, OutputParser } from "@/app/api/lib/types";
import { Habit } from "@/lib/persist/habit";
import { PromptTemplate } from "@langchain/core/prompts";

/**
 * 习惯提示构建器
 */
export class HabitPromptBuilder implements PromptBuilder<Habit> {
  buildCreatePrompt(): PromptTemplate {
    return PromptTemplate.fromTemplate(`
      作为一个习惯养成助手，根据用户的描述创建一个新的习惯项目。
      
      如果用户提供了具体信息，请基于这些信息创建习惯；如果没有，请生成一个合理的习惯项目。
      
      习惯应该具备以下属性:
      - name: 习惯的名称，简洁明了
      - description: 习惯的详细描述，包括如何执行和预期收益
      - frequency: 执行频率，从 'daily', 'weekly', 'monthly', 'scenario' 中选择一个
      - category: 习惯的分类，如健康、学习、工作等
      - reward_points: 完成后获得的奖励点数（1-5之间的整数）
      
      确保习惯是具体的、可执行的，并且有明确的完成标准。
      
      请以JSON格式返回结果，不要包含任何其他内容。
      
      用户描述: {{userPrompt}}
    `);
  }

  buildUpdatePrompt(): PromptTemplate {
    return PromptTemplate.fromTemplate(`
      作为一个习惯养成助手，你需要根据用户的要求更新一个现有的习惯。
      
      当前习惯信息:
      - ID: {{id}}
      - 名称: {{name}}
      - 描述: {{description}}
      - 频率: {{frequency}}
      - 分类: {{category}}
      - 奖励点数: {{reward_points}}
      - 状态: {{status}}
      
      用户想要进行以下更新: {{userPrompt}}
      
      请基于用户的要求，提供更新后的习惯信息。只需要返回需要更新的字段，如果某些字段不需要更新，请不要包含它们。
      
      请以JSON格式返回结果，不要包含任何其他内容。
    `);
  }
}

/**
 * 习惯输出解析器
 */
export class HabitOutputParser implements OutputParser<Habit> {
  parseCreateOutput(output: string): Partial<Habit> {
    try {
      // 清理输出中可能存在的格式问题
      const jsonStr = output.replace(/```json|```/g, '').trim();
      const habit = JSON.parse(jsonStr);
      
      // 验证并格式化必要字段
      return {
        name: habit.name,
        description: habit.description,
        frequency: this.validateFrequency(habit.frequency),
        category: habit.category,
        reward_points: this.validateRewardPoints(habit.reward_points),
        status: 'active' // 新创建的习惯默认为活跃状态
      };
    } catch (error) {
      console.error('解析习惯创建输出时出错:', error);
      throw new Error('无法解析AI生成的习惯数据');
    }
  }

  parseUpdateOutput(output: string, existingData: Habit): Partial<Habit> {
    try {
      // 清理输出中可能存在的格式问题
      const jsonStr = output.replace(/```json|```/g, '').trim();
      const updates = JSON.parse(jsonStr);
      
      // 验证并格式化更新字段
      const validatedUpdates: Partial<Habit> = {};
      
      if (updates.name) validatedUpdates.name = updates.name;
      if (updates.description !== undefined) validatedUpdates.description = updates.description;
      if (updates.frequency) validatedUpdates.frequency = this.validateFrequency(updates.frequency);
      if (updates.category !== undefined) validatedUpdates.category = updates.category;
      if (updates.reward_points !== undefined) validatedUpdates.reward_points = this.validateRewardPoints(updates.reward_points);
      if (updates.status) validatedUpdates.status = this.validateStatus(updates.status);
      
      return validatedUpdates;
    } catch (error) {
      console.error('解析习惯更新输出时出错:', error);
      throw new Error('无法解析AI生成的习惯更新数据');
    }
  }

  // 验证频率是否有效
  private validateFrequency(value: string): 'daily' | 'weekly' | 'monthly' | 'scenario' {
    const validValues = ['daily', 'weekly', 'monthly', 'scenario'];
    if (!validValues.includes(value)) {
      return 'daily'; // 默认为每日
    }
    return value as 'daily' | 'weekly' | 'monthly' | 'scenario';
  }

  // 验证奖励点数是否有效
  private validateRewardPoints(value: any): number {
    const points = Number(value);
    if (isNaN(points) || points < 1) {
      return 1; // 默认为1点
    }
    if (points > 5) {
      return 5; // 最大为5点
    }
    return Math.floor(points); // 确保是整数
  }

  // 验证状态是否有效
  private validateStatus(value: string): 'active' | 'inactive' | 'archived' {
    const validValues = ['active', 'inactive', 'archived'];
    if (!validValues.includes(value)) {
      return 'active'; // 默认为活跃
    }
    return value as 'active' | 'inactive' | 'archived';
  }
}