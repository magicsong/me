import { PromptBuilder, OutputParser } from '../lib/types';
import { TodoBO } from "@/app/api/types";
import { PromptTemplate } from "@langchain/core/prompts";

export class TodoPromptBuilder implements PromptBuilder<TodoBO> {
  /**
   * 基础提示模板
   */
  build(): PromptTemplate {
    return PromptTemplate.fromTemplate(`
    你是一个任务管理助手，请帮助用户创建和管理他们的待办事项。
    请理解用户的需求，并根据输入生成相应的待办事项。
    `);
  }

  /**
   * 创建待办事项的提示模板
   */
  buildCreatePrompt(): PromptTemplate {
    return PromptTemplate.fromTemplate(`
    请根据用户的输入: {userPrompt} 以及可能提供的部分信息生成一个合理的待办事项，
    包括新增的事项和更新的事项（如果提供了当前事项，且有必要更新），并不是一定要更新当前的事项
    更新时请保留原来的ID，只修改内容，并补充更新理由
    
    待办事项应该包含以下字段：
    - title: 任务标题，必填
    - description: 任务描述，必填
    - status: 任务状态，可选值为 'active', 'completed', 'archived'，默认为 'active'
    - priority: 任务优先级，可选值为 'urgent', 'high', 'medium', 'low'，默认为 'medium'
    - planned_date: 计划完成日期，格式为 YYYY-MM-DD（可选）
    - planned_start_time: 计划开始时间，ISO 格式（可选）
    - planned_end_time: 计划结束时间，ISO 格式（可选）
    - update_reason:  你为什么要更新此事项，仅仅用于更新存量事项场景（可选）
      
    此外，这个是现有待办事项: {existingData}
    
    回复格式必须严格按照以下JSON格式：
    {{
      "created": [
        {{ /* 待办事项1 */ }},
        {{ /* 待办事项2 */ }}
        // 更多待办事项...
      ]
      ,
      "updated": [
        {{ /* 更新后的待办事项1 */ }},
        {{ /* 更新后的待办事项2 */ }}
        // 更多更新的待办事项...
      ]
    }}`);
  }

  /**
   * 更新待办事项的提示模板
   */
  buildUpdatePrompt(): PromptTemplate {
    return PromptTemplate.fromTemplate(`
    请根据以下提示更新一个已有的待办事项。
    
    待办事项可能包含以下字段：
    - title: 任务标题
    - description: 任务描述
    - status: 任务状态，可选值为 'active', 'completed', 'archived'
    - priority: 任务优先级，可选值为 'urgent', 'high', 'medium', 'low'
    - planned_date: 计划完成日期，格式为 YYYY-MM-DD
    - planned_start_time: 计划开始时间，ISO 格式
    - planned_end_time: 计划结束时间，ISO 格式
    - completed_at: 完成时间，ISO 格式
    
    原始待办事项: {originalData}
    
    请根据用户的输入: {userPrompt} 更新上述待办事项。
    只需包含应该更新的字段，保持其他字段不变。
    
    回复格式必须为严格的JSON对象，仅包含需要更新的字段。
    `);
  }

  /**
   * 任务规划的提示模板
   */
  buildPlanPrompt(): PromptTemplate {
    return PromptTemplate.fromTemplate(`
    您是一位专业的个人时间管理助手。请根据用户提供的信息和当天的待办事项，为用户规划一天的时间安排。
    
    用户的规划请求: {userPrompt}
    
    当天的待办事项列表:
    {todayTasks}
    
    请按照以下要求生成一个合理的时间规划:
    1. 考虑任务的优先级（priority字段: urgent > high > medium > low）
    2. 考虑任务的描述和可能的时间要求
    3. 安排合理的休息时间
    4. 如果任务已经有planned_start_time和planned_end_time，优先使用这些时间
    5. 如果时间不足，请根据优先级调整或建议延期低优先级任务
    
    您的回复必须是严格的JSON格式，不允许擅自自行转义，包含以下结构:
    {{
      "schedule": [
        {{
          "taskId": "任务ID",
          "title": "任务标题",
          "startTime": "开始时间（24小时制，如 09:00）",
          "endTime": "结束时间（24小时制，如 10:30）",
          "duration": "持续时间（分钟）",
          "notes": "关于该时间段安排的说明或建议"
        }}
      ],
      "breaks": [
        {{
          "startTime": "休息开始时间",
          "endTime": "休息结束时间",
          "type": "休息类型，如'lunch', 'coffee', 'rest'"
        }}
      ],
      "summary": "对整体规划的总结和建议",
      "unscheduled": [
        {{
          "taskId": "未能安排的任务ID",
          "title": "未能安排的任务标题",
          "reason": "未能安排的原因"
        }}
      ]
    }}
    
    请确保JSON格式正确，所有时间采用24小时制，并考虑到一天的实际可用时间。如无特殊说明，假设工作时间为{timeRange}。
    `);
  }
}

export class TodoOutputParser implements OutputParser<TodoBO> {
  parse(output: string): Partial<TodoBO> {
    try {
      // 尝试直接解析 JSON
      return JSON.parse(output);
    } catch (error) {
      // 如果直接解析失败，尝试从文本中提取 JSON
      const jsonMatch = output.match(/```(?:json)?([\s\S]*?)```/) || output.match(/{[\s\S]*?}/);
      
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0].replace(/```json|```/g, '').trim());
        } catch (innerError) {
          console.error('解析 JSON 失败:', innerError);
          throw new Error('无法解析 LLM 输出为有效的 JSON');
        }
      }
      
      console.error('未找到有效的 JSON 输出:', output);
      throw new Error('LLM 输出中未找到有效的 JSON');
    }
  }

  parseCreateOutput(output: string): Partial<TodoBO> {
    const todoData = this.parse(output);
    
    // 确保必要字段
    if (!todoData.title) {
      throw new Error('创建的待办事项必须包含标题');
    }
    
    // 设置默认值
    return {
      ...todoData,
      status: todoData.status || 'active',
      priority: todoData.priority || 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  parseUpdateOutput(output: string, existingData: TodoBO): Partial<TodoBO> {
    const updateData = this.parse(output);
    
    // 如果状态变为已完成且没有提供完成时间，则自动设置完成时间
    if (updateData.status === 'completed' && !updateData.completedAt && existingData.status !== 'completed') {
      updateData.completedAt = new Date().toISOString();
    }
    
    updateData.updatedAt = new Date().toISOString();
    
    return updateData;
  }

  /**
   * 解析批量生成的待办事项
   */
  parseCreateOutputArray(output: string): Partial<TodoBO>[] {
    try {
      const parsed = this.parse(output);
      
      // 如果输出已经是数组格式
      if (Array.isArray(parsed)) {
        return parsed.map(item => this.ensureValidTodo(item));
      }
      
      // 如果输出是包含created数组的对象
      if (parsed.created && Array.isArray(parsed.created)) {
        return parsed.created.map(item => this.ensureValidTodo(item));
      }
      
      // 单个对象情况，包装为数组
      return [this.ensureValidTodo(parsed)];
    } catch (error) {
      console.error('解析批量待办事项失败:', error);
      throw new Error('无法解析批量生成的待办事项');
    }
  }

  /**
   * 解析批量AI生成结果，并区分新创建和更新的项
   */
  parseBatchWithUpdates(output: string, existingDataArray?: TodoBO[]): {
    created: Partial<TodoBO>[];
    updated: TodoBO[];
  } {
    try {
      const parsed = this.parse(output);
      
      // 标准格式：{ created: [...], updated: [...] }
      if (parsed.created || parsed.updated) {
        return {
          created: Array.isArray(parsed.created) 
            ? parsed.created.map(item => this.ensureValidTodo(item)) 
            : [],
          updated: Array.isArray(parsed.updated) && existingDataArray
            ? this.processUpdatedItems(parsed.updated, existingDataArray)
            : []
        };
      }
      
      // 如果只有一个数组，假定全部是新创建的
      if (Array.isArray(parsed)) {
        return {
          created: parsed.map(item => this.ensureValidTodo(item)),
          updated: []
        };
      }
      
      // 单个对象，默认为创建
      return {
        created: [this.ensureValidTodo(parsed)],
        updated: []
      };
    } catch (error) {
      console.error('解析批量待办事项失败:', error);
      throw new Error('无法解析批量生成和更新的待办事项');
    }
  }

  /**
   * 确保待办事项对象包含必要的字段和默认值
   */
  private ensureValidTodo(item: any): Partial<TodoBO> {
    if (!item.title) {
      throw new Error('待办事项必须包含标题');
    }
    
    return {
      ...item,
      status: item.status || 'active',
      priority: item.priority || 'medium',
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * 处理更新项，与现有数据合并
   */
  private processUpdatedItems(updates: any[], existingItems: TodoBO[]): TodoBO[] {
    return updates.map((update, index) => {
      const existingItem = index < existingItems.length ? existingItems[index] : null;
      if (!existingItem) {
        throw new Error(`无法找到对应的现有待办事项 (索引: ${index})`);
      }
      
      // 如果状态变为已完成且没有提供完成时间，则自动设置完成时间
      if (update.status === 'completed' && !update.completedAt && existingItem.status !== 'completed') {
        update.completedAt = new Date().toISOString();
      }
      
      return {
        ...existingItem,
        ...update,
        id: existingItem.id, // 确保保留ID
        updatedAt: new Date().toISOString()
      };
    });
  }
}
