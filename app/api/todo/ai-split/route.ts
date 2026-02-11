import { NextRequest, NextResponse } from 'next/server';
import { callLLMOnce } from '@/lib/langchain/chains';
import { TodoPromptBuilder, TodoOutputParser } from '../prompt';
import { trimLLMContentToJsonObject, trimLLMContentToJsonArray } from '@/lib/langchain/utils';
import { getCurrentUserId } from '@/lib/utils';
import { TodoBO } from '@/app/api/types';

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }

    const { parentId, title, description, priority, userPrompt } = await req.json();

    if (!parentId || !title) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 创建提示构建器和输出解析器
    const promptBuilder = new TodoPromptBuilder();
    const outputParser = new TodoOutputParser();

    // 构建任务拆解提示（可以包含用户自定义的指示）
    const decomposePrompt = promptBuilder.buildDecomposePrompt();
    
    const context = {
      title,
      description: description || '',
      priority: priority || 'medium',
      plannedTime: '未指定',
      userRequirements: userPrompt ? `\n用户特别说明: ${userPrompt}` : ''
    };

    // 生成缓存键
    const cacheKey = `todo-ai-split-${parentId}-${Date.now()}`;

    // 调用LLM生成子任务
    const llmResponse = await callLLMOnce(decomposePrompt, context, cacheKey);

    // 解析AI响应
    let subtasks: Partial<TodoBO>[] = [];
    try {
      // 尝试解析JSON
      const jsonContent = typeof llmResponse.content === 'string' 
        ? llmResponse.content 
        : JSON.stringify(llmResponse.content);
      
      // 先尝试提取数组格式（因为返回的应该是子任务数组）
      let trimmedJson = trimLLMContentToJsonArray(jsonContent);
      
      // 如果没有找到数组，尝试提取对象格式
      if (!trimmedJson.startsWith('[')) {
        trimmedJson = trimLLMContentToJsonObject(jsonContent);
      }
      
      const parsed = JSON.parse(trimmedJson);

      // 处理解析结果
      if (Array.isArray(parsed)) {
        subtasks = parsed.map(item => ({
          title: item.title || '未命名子任务',
          description: item.description,
          priority: item.priority || priority || 'medium',
          plannedDate: item.plannedDate,
          status: 'pending' as const
        }));
      } else if (parsed.subtasks && Array.isArray(parsed.subtasks)) {
        subtasks = parsed.subtasks.map((item: any) => ({
          title: item.title || '未命名子任务',
          description: item.description,
          priority: item.priority || priority || 'medium',
          plannedDate: item.plannedDate,
          status: 'pending' as const
        }));
      }
    } catch (parseError) {
      console.error('解析LLM响应失败:', parseError);
      // 如果解析失败，返回一个默认的拆解结果
      subtasks = [
        {
          title: `${title} - 步骤1`,
          description: '第一步',
          priority: priority || 'medium',
          status: 'pending' as const
        },
        {
          title: `${title} - 步骤2`,
          description: '第二步',
          priority: priority || 'medium',
          status: 'pending' as const
        },
        {
          title: `${title} - 步骤3`,
          description: '第三步',
          priority: priority || 'medium',
          status: 'pending' as const
        }
      ];
    }

    // 返回结果
    return NextResponse.json({
      success: true,
      data: subtasks.slice(0, 5), // 最多返回5个子任务
      message: `成功拆解为${subtasks.length}个子任务`
    });
  } catch (error) {
    console.error('AI拆分任务失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'AI拆分任务失败'
      },
      { status: 500 }
    );
  }
}
