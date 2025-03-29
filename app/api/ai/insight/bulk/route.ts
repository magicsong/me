import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { bulkInsertAiInsights } from '@/lib/db/ai-insight';
import { InsightData } from '@/lib/types/ai-insight';

// 批量创建 AI 洞察
export async function POST(request: NextRequest) {
  try {
    // 权限检查
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权：需要用户登录' }, { status: 401 });
    }
    
    const { insights } = await request.json();
    
    if (!Array.isArray(insights) || insights.length === 0) {
      return NextResponse.json({ error: '没有提供有效的洞察数据' }, { status: 400 });
    }
    
    // 确保使用当前用户ID
    const insightsData: InsightData[] = insights.map(item => ({
      ...item,
      user_id: session.user.id,
      time_period_start: new Date(item.time_period_start),
      time_period_end: new Date(item.time_period_end)
    }));
    
    const result = await bulkInsertAiInsights(insightsData);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error || '批量创建AI洞察失败' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: result.data,
      count: result.data.length
    }, { status: 201 });
  } catch (error) {
    console.error('批量创建AI洞察失败:', error);
    return NextResponse.json(
      { error: '处理请求时发生错误', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
