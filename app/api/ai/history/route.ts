import { NextRequest, NextResponse } from 'next/server';
import { getLLMHistory } from '@/lib/db/llm';
import { getCurrentUserId } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();

    // 获取分页参数
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    
    // 可选：只有登录用户才能查看自己的记录
    // 如果不需要鉴权，可以去掉userId参数
    const result = await getLLMHistory(page, pageSize, userId);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('获取LLM历史记录失败:', error);
    return NextResponse.json(
      { error: '获取历史记录失败' },
      { status: 500 }
    );
  }
}
