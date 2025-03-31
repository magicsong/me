import { NextRequest, NextResponse } from 'next/server';
import { getLLMRecordById } from '@/lib/db/llm';
import { getCurrentUserId } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证ID参数
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { error: '无效的记录ID' },
        { status: 400 }
      );
    }
    const userId = await getCurrentUserId();
    const record = await getLLMRecordById(id);
    
    // 可选：权限检查，确保用户只能查看自己的记录
    if (record && record.userId && record.userId !== userId) {
      return NextResponse.json(
        { error: '无权访问此记录' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({ record });
  } catch (error) {
    console.error('获取LLM记录详情失败:', error);
    return NextResponse.json(
      { error: '获取记录详情失败' },
      { status: 500 }
    );
  }
}
