import { NextRequest, NextResponse } from 'next/server';
import { AIInsightHandler } from './handler';
import { AIInsightPersistenceService } from './persistence';
import { AIInsightPromptBuilder } from './promptBuilder';
import { AIInsightOutputParser } from './outputParser';
import { BaseRequest, BaseResponse } from '@/app/api/lib/types';
import { AIInsightBO } from './types';
import { getCurrentUserId } from '@/lib/utils';


// 初始化服务和处理器
const persistenceService = new AIInsightPersistenceService();
const promptBuilder = new AIInsightPromptBuilder();
const outputParser = new AIInsightOutputParser();
const handler = new AIInsightHandler(persistenceService, promptBuilder, outputParser);

// GET请求处理（获取所有或分页）
export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }

  // 获取URL参数
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');
  const pageStr = searchParams.get('page');
  const pageSizeStr = searchParams.get('pageSize');
  
  // 新增过滤参数
  const kind = searchParams.get('kind');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  try {
    // 获取单个洞察
    if (id) {
      const insight = await handler.getById(id);
      if (!insight) {
        return NextResponse.json({ success: false, error: '找不到指定的洞察' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: insight });
    }

    // 构建过滤条件
    const filters: Record<string, any> = {};
    if (kind) filters.kind = kind;
    if (startDate) filters.timePeriodStart = startDate;
    if (endDate) filters.timePeriodEnd = endDate;

    // 分页获取（带过滤条件）
    if (pageStr) {
      const page = parseInt(pageStr) || 1;
      const pageSize = parseInt(pageSizeStr || '10');
      const result = await handler.getPageWithFilters(page, pageSize, userId, filters);
      return NextResponse.json({ success: true, ...result });
    }

    // 获取所有（带过滤条件）
    const insights = await handler.getAllWithFilters(userId, filters);
    return NextResponse.json({ success: true, data: insights });
  } catch (error) {
    console.error('获取AI洞察失败:', error);
    return NextResponse.json(
      { success: false, error: '获取AI洞察失败' },
      { status: 500 }
    );
  }
}

// POST请求处理（创建）
export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId()
  if (!userId) {
    return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const req: BaseRequest<AIInsightBO> = {
      ...body,
      // 强制设置为true，确保调用LLM生成内容
      autoGenerate: true,
      data: body.data ? 
        (Array.isArray(body.data) ? 
          body.data.map(item => ({ ...item, userId })) : 
          { ...body.data, userId }) : 
        undefined
    };

    const response: BaseResponse<AIInsightBO> = await handler.handleCreate(req);
    
    if (!response.success) {
      return NextResponse.json(response, { status: 400 });
    }
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('创建AI洞察失败:', error);
    return NextResponse.json(
      { success: false, error: '创建AI洞察失败' },
      { status: 500 }
    );
  }
}

// PUT请求处理（更新）
export async function PUT(request: NextRequest) {
  const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }

  try {
    const body = await request.json();
    
    // 确保只能更新自己的数据
    if (Array.isArray(body.data)) {
      // 批量更新前先验证所有权
      const ids = body.data.map(item => item.id);
      for (const id of ids) {
        const existing = await handler.getById(id);
        if (!existing || existing.userId !== userId) {
          return NextResponse.json(
            { success: false, error: '无权更新其他用户的数据' },
            { status: 403 }
          );
        }
      }
    } else if (body.data?.id) {
      // 单个更新验证所有权
      const existing = await handler.getById(body.data.id);
      if (!existing || existing.userId !== userId) {
        return NextResponse.json(
          { success: false, error: '无权更新其他用户的数据' },
          { status: 403 }
        );
      }
    }

    // 强制设置为true，确保调用LLM生成内容
    const req: BaseRequest<AIInsightBO> = {
      ...body,
      autoGenerate: true
    };

    const response = await handler.handleUpdate(req);
    
    if (!response.success) {
      return NextResponse.json(response, { status: 400 });
    }
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('更新AI洞察失败:', error);
    return NextResponse.json(
      { success: false, error: '更新AI洞察失败' },
      { status: 500 }
    );
  }
}

// DELETE请求处理
export async function DELETE(request: NextRequest) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json(
      { success: false, error: '删除操作需要提供ID' },
      { status: 400 }
    );
  }

  try {
    // 验证所有权
    const existing = await handler.getById(id);
    if (!existing || existing.userId !== userId) {
      return NextResponse.json(
        { success: false, error: '无权删除其他用户的数据' },
        { status: 403 }
      );
    }

    await persistenceService.delete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除AI洞察失败:', error);
    return NextResponse.json(
      { success: false, error: '删除AI洞察失败' },
      { status: 500 }
    );
  }
}
