import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateTodoItemsPlan } from '@/lib/langchain/chains';

// 示例输出格式与字段描述
const EXAMPLE_OUTPUT = `[
  {
    "title": "调研市场上现有的类似产品",
    "description": "分析至少5个竞品的功能和优缺点",
    "priority": "high",
    "status": "pending", 
    "estimatedDuration": 120, // 预估耗时（分钟）
    "suggestedTags": ["研究", "市场分析"]
  },
  {
    "title": "设计产品原型",
    "description": "使用Figma绘制基础UI设计稿",
    "priority": "medium",
    "status": "pending",
    "estimatedDuration": 180,
    "suggestedTags": ["设计", "UI/UX"]
  }
]`;

export async function POST(request: NextRequest) {
  try {
    // 权限检查
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权：需要用户登录' }, { status: 401 });
    }

    // 解析请求
    const { description } = await request.json();
    if (!description) {
      return NextResponse.json({ error: '请提供任务描述' }, { status: 400 });
    }

    // 调用Langchain生成任务计划
    const todoItems = await generateTodoItems(description);
    
    return NextResponse.json({
      success: true,
      todoItems
    });
  } catch (error) {
    console.error('生成待办事项计划失败:', error);
    return NextResponse.json(
      { error: '处理请求时发生错误', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

async function generateTodoItems(description: string) {
  // 获取当前时间信息
  const now = new Date();
  const currentTime = {
    date: now.toLocaleDateString('zh-CN'),
    time: now.toLocaleTimeString('zh-CN'),
    dayOfWeek: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()]
  };

  // 构造提示词
  const prompt = `
当前时间：${currentTime.date} ${currentTime.dayOfWeek} ${currentTime.time}

请根据以下任务描述，将其拆分为具体的待办事项列表，确保每个任务明确、可执行、颗粒度适中。

任务描述：${description}

请将结果格式化为可解析的JSON数组，每个待办事项包含以下字段：
- title: 待办事项标题（简洁明了）
- description: 详细描述（包含具体要做什么）
- priority: 优先级（"low", "medium", "high", "urgent"四选一）
- status: 状态（设为"pending"）
- estimatedDuration: 预估完成时间（分钟）
- suggestedTags: 建议的标签数组（字符串数组）

示例输出格式：
${EXAMPLE_OUTPUT}

请根据任务的逻辑顺序和依赖关系进行排序，并只返回JSON数组，不要包含其他解释文字。
`;

  try {
    // 使用Langchain生成任务计划
    return await generateTodoItemsPlan(prompt);
  } catch (error) {
    console.error('生成任务计划失败:', error);
    throw error;
  }
}
