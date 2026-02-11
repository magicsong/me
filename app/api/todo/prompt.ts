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
    你是一个智能任务管理助手。请根据用户的输入生成合理的待办事项。
    
    用户输入: {userPrompt}
    现有待办事项: {existingData}
    
    任务生成指南：
    1. 理解用户的真实意图，创建或更新相应的任务
    2. 如果用户明确要求修改现有任务，才更新；否则默认创建新任务
    3. 对于复杂或多步骤的输入，自动拆解为子任务
    4. 子任务应该是独立可执行、时间在30分钟-2小时的小任务
    5. 保持任务的上下文和目标清晰
    
    大任务判断标准（满足任一条件即为大任务）：
    - 描述长度超过200字符
    - 包含多个步骤关键词：\"然后\"、\"接着\"、\"最后\"、\"首先\"、\"其次\"等
    - 涉及多个不同的工作领域或技能
    - 预计完成时间超过2小时
    
    待办事项字段说明：
    - title (必填): 清晰、可操作的任务标题
    - description (必填): 详细的任务描述，说明\"做什么\"和\"为什么\"
    - status: 'pending'(待办)|'in_progress'(进行中)|'completed'(已完成)|'archived'(已归档)，默认'pending'
    - priority: 'urgent'(紧急)|'high'(高)|'medium'(中)|'low'(低)，默认'medium'
    - planned_date: YYYY-MM-DD格式的计划完成日期
    - planned_start_time: ISO格式的计划开始时间
    - planned_end_time: ISO格式的计划结束时间
    - isLargeTask: boolean，是否需要拆解为子任务
    - subtasks: 如果isLargeTask=true，提供3-5个子任务数组（包含title、description、priority）
    
    严格的JSON响应格式:
    {{
      "created": [
        {{
          "title": "任务标题",
          "description": "详细描述",
          "priority": "high|medium|low",
          "planned_date": "2024-02-15",
          "isLargeTask": false,
          "subtasks": []
        }}
      ],
      "updated": []
    }}
    
    重要提示：
    - 只返回JSON，不要有其他文字
    - 如果没有需要更新的项，updated数组留空
    - 如果是大任务，务必提供subtasks数组
    `);
  }

  /**
   * 任务拆解提示模板 - 将大任务自动拆解为子任务
   */
  buildDecomposePrompt(): PromptTemplate {
    return PromptTemplate.fromTemplate(`
    你是一个资深的项目管理和任务分解专家。你的目标是将复杂的大任务拆解成可执行的、有清晰交付物的子任务链。
    
    【待拆解的任务】
    标题: {title}
    描述: {description}
    优先级: {priority}
    预计时间: {plannedTime}
    {userRequirements}
    
    【拆解原则】
    1. 逻辑顺序：子任务应按照自然的执行顺序排列，体现依赖关系
    2. 粒度控制：每个子任务应该是30分钟到1小时可完成的工作量
    3. 独立性：每个子任务应该有明确的输入、输出和成功标准
    4. 完整性：所有子任务一起应该完全覆盖父任务的所有工作
    5. 优先级：子任务优先级应与父任务一致，后续任务可适度降低
    6. 可操作性：标题应该是动作词开头，如\"设计...\"、\"实现...\"、\"测试...\"等
    
    【子任务描述应该包含】
    - 做什么（具体的工作内容）
    - 为什么（完成此子任务的目的）
    - 成功标准（如何判断完成）
    - 可选的前置条件或注意事项
    
    【返回格式 - 严格的JSON数组】
    [
      {{
        "title": "启动/准备/分析... [具体内容]",
        "description": "详细说明这个子任务需要做什么，为什么要做，完成标准是什么",
        "priority": "high|medium|low",
        "plannedDate": "YYYY-MM-DD（可选，如有用户指定）"
      }},
      {{
        "title": "第二步/实现... [具体内容]",
        "description": "...",
        "priority": "medium",
        "plannedDate": "..."
      }}
    ]
    
    【重要提示】
    - 只返回JSON数组，不要包含其他解释文字
    - 生成3-5个子任务
    - 确保子任务标题清晰有力，让人一目了然
    - 如果用户有特殊拆分需求（如按时间、按优先级、按工作流程），优先满足用户需求
    `);
  }

  /**
   * 更新待办事项的提示模板
   */
  buildUpdatePrompt(): PromptTemplate {
    return PromptTemplate.fromTemplate(`
    你是一个任务更新助手。请根据用户的指示智能更新现有任务。
    
    【当前任务信息】
    {originalData}
    
    【用户的更新指示】
    {userPrompt}
    
    【更新指南】
    1. 理解用户的真实意图，只更新必要的字段
    2. 保留用户没有明确要求改动的信息
    3. 如果用户说\"改为...\"或\"设置为...\"，则更新对应字段
    4. 必须保留任务的原始ID
    5. 提供更新的理由和影响说明
    
    【可更新的字段】
    - title: 任务标题
    - description: 任务描述和详细信息
    - status: 'pending'(待办)|'in_progress'(进行中)|'completed'(已完成)|'archived'(已归档)
    - priority: 'urgent'(紧急)|'high'(高)|'medium'(中)|'low'(低)
    - planned_date: YYYY-MM-DD格式的计划完成日期
    - planned_start_time: ISO标准格式的开始时间
    - planned_end_time: ISO标准格式的结束时间
    - completed_at: ISO标准格式的实际完成时间（仅当状态变为completed时）
    
    【JSON响应格式 - 仅包含更新的字段】
    {{
      "id": 原ID,
      "title": "新标题（如果更新）",
      "priority": "high",
      "status": "in_progress",
      "update_reason": "说明为什么进行这些更新"
    }}
    
    【重要提示】
    - 只返回JSON，不要有其他文字
    - 如果不需要更新某个字段，则不包含在返回结果中
    `);
  }

  /**
   * 任务规划的提示模板
   */
  buildPlanPrompt(): PromptTemplate {
    return PromptTemplate.fromTemplate(`
    你是一个资深的个人时间管理顾问和生产力专家。根据用户的反馈和任务列表，为用户制定一个实用、平衡、可执行的每日计划。
    
    【用户的规划需求】
    {userPrompt}
    
    【待规划的任务列表】
    {todayTasks}
    
    【规划原则】
    1. 优先级优先：urgent > high > medium > low
    2. 时间约束：尊重任务既有的planned_start_time和planned_end_time
    3. 合理分配：避免过度疲劳，穿插休息时间
    4. 现实可行：确保计划在一天内可完成
    5. 灵活建议：如果时间冲突，提出明确的优化建议
    
    【时间分配建议】
    - 高强度任务应安排在精力最好的时段（通常上午9-12点）
    - 每工作60-90分钟安排5-10分钟休息
    - 需要创意的任务避免安排在低谷时段
    - 重要性低或机械性任务可安排在下午
    - 保留30分钟的缓冲时间以应对突发情况
    
    【返回JSON结构】
    {{
      "schedule": [
        {{
          "taskId": "123",
          "title": "任务标题",
          "startTime": "09:00",
          "endTime": "10:30",
          "duration": 90,
          "type": "work|admin|creative|review",
          "notes": "建议：在开始前准备好所需工具..."
        }}
      ],
      "breaks": [
        {{
          "startTime": "10:30",
          "endTime": "10:40",
          "type": "coffee|lunch|rest|walk",
          "suggestion": "建议做什么来充电"
        }}
      ],
      "summary": "今日计划统计与建议",
      "unscheduled": [
        {{
          "taskId": "456",
          "title": "任务标题",
          "reason": "时间限制，建议延到明天"
        }}
      ]
    }}
    
    【重要提示】
    - 只返回JSON，无需其他文字
    - 所有时间使用24小时制
    - 确保整个计划在{timeRange}时间范围内可完成
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
      status: item.status || 'pending',
      priority: item.priority || 'medium',
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * 解析任务拆解结果，返回子任务数组
   */
  parseDecomposeOutput(output: string): Array<Partial<TodoBO>> {
    try {
      const parsed = this.parse(output);
      
      // 如果输出直接是数组
      if (Array.isArray(parsed)) {
        return parsed.map(item => ({
          title: item.title,
          description: item.description,
          priority: item.priority || 'medium',
          plannedDate: item.plannedDate,
          status: 'pending' as const
        }));
      }
      
      throw new Error('拆解结果必须是数组格式');
    } catch (error) {
      console.error('解析任务拆解结果失败:', error);
      throw new Error('无法解析任务拆解结果');
    }
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
