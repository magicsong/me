import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateTodoItemsPlan } from '@/lib/langchain/chains';
import { createTodo, addTagToTodo } from '@/lib/db-todolist';
import { db } from '@/lib/db';
import { pomodoro_tags } from '@/iac/drizzle/schema';
import { eq } from 'drizzle-orm';

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
    
    // 保存生成的待办事项到数据库
    const savedTasks = await saveTodoItems(todoItems);
    
    return NextResponse.json({
      success: true,
      todoItems: savedTasks,
      message: '待办事项已成功生成并保存'
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

// 新增：保存待办事项到数据库
async function saveTodoItems(todoItems: any[]) {
  const savedItems = [];
  
  for (const item of todoItems) {
    // 计算截止日期：当前时间 + 预估时间（分钟）
    const dueDate = new Date();
    dueDate.setMinutes(dueDate.getMinutes() + (item.estimatedDuration || 0));
    
    // 保存待办事项
    const savedTodo = await createTodo({
      title: item.title,
      description: item.description || '',
      priority: item.priority?.toLowerCase() || 'medium',
      status: 'pending',
      due_date: dueDate,
      estimated_duration: item.estimatedDuration || 0
    });
    
    // 处理标签
    if (item.suggestedTags && Array.isArray(item.suggestedTags)) {
      const tagPromises = item.suggestedTags.map(async (tagName: string) => {
        // 查找是否已存在相同名称的标签
        let existingTags = await db
          .select()
          .from(pomodoro_tags)
          .where(eq(pomodoro_tags.name, tagName));
        
        let tagId;
        if (existingTags.length > 0) {
          // 使用现有标签
          tagId = existingTags[0].id;
        } else {
          // 创建新标签 (假设有一个创建标签的函数)
          const [newTag] = await db
            .insert(pomodoro_tags)
            .values({ name: tagName, color: generateRandomColor() })
            .returning();
          tagId = newTag.id;
        }
        
        // 关联标签与待办事项
        await addTagToTodo(savedTodo.id, tagId);
      });
      
      await Promise.all(tagPromises);
    }
    
    // 重新获取保存后的待办事项（包含标签）
    savedItems.push(savedTodo);
  }
  
  return savedItems;
}

// 生成随机颜色
function generateRandomColor() {
  const colors = [
    "#FF5733", "#33FF57", "#3357FF", "#FF33A8", 
    "#33A8FF", "#A833FF", "#FF8C33", "#33FFE0"
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
