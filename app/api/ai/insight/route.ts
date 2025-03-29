import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { 
  getAiInsightsByUser, 
  getAiInsightsByKind, 
  getAiInsightsByTimeRange,
  createAiInsight 
} from '@/lib/db/ai-insight';
import { InsightData } from '@/lib/types/ai-insight';
import { insightKind } from '@../../iac/drizzle/schema';
import { parseISO } from 'date-fns';

// 获取 AI 洞察列表
export async function GET(request: NextRequest) {
  try {
    // 权限检查
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权：需要用户登录' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const kind = searchParams.get('kind') as typeof insightKind.enumValues[number] | null;
    const limit = Number(searchParams.get('limit') || 20);
    const offset = Number(searchParams.get('offset') || 0);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    let result;
    
    // 根据参数决定调用哪个查询方法
    if (startDate && endDate) {
      result = await getAiInsightsByTimeRange(
        session.user.id, 
        parseISO(startDate), 
        parseISO(endDate),
        kind
      );
    } else if (kind) {
      result = await getAiInsightsByKind(session.user.id, kind, limit, offset);
    } else {
      result = await getAiInsightsByUser(session.user.id, limit, offset);
    }
    
    if (!result.success) {
      return NextResponse.json({ error: result.error || '获取AI洞察失败' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('获取AI洞察列表失败:', error);
    return NextResponse.json(
      { error: '处理请求时发生错误', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// 创建新的 AI 洞察
export async function POST(request: NextRequest) {
  try {
    // 权限检查
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权：需要用户登录' }, { status: 401 });
    }
    
    const data = await request.json();
    
    // 验证必要字段
    if (!data.kind || !data.time_period_start || !data.time_period_end || !data.content) {
      return NextResponse.json({ error: '缺少必要的参数' }, { status: 400 });
    }
    
    // 确保使用当前用户ID
    const insightData: InsightData = {
      user_id: session.user.id,
      kind: data.kind,
      time_period_start: parseISO(data.time_period_start),
      time_period_end: parseISO(data.time_period_end),
      content: data.content,
      title: data.title || '',
      metadata: data.metadata || {}
    };
    
    const result = await createAiInsight(insightData);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error || '创建AI洞察失败' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: result.data
    }, { status: 201 });
  } catch (error) {
    console.error('创建AI洞察失败:', error);
    return NextResponse.json(
      { error: '处理请求时发生错误', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
