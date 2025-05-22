import { NextRequest, NextResponse } from 'next/server';
import { generateSummaryFeedback } from '@/lib/langchain/chains';
import { auth } from "@/lib/auth";

// 用于生成总结建议的API
export async function POST(request: NextRequest) {
  try {
    // 权限检查
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权：需要用户登录' }, { status: 401 });
    }

    // 解析请求内容
    const { prompt, type, resetMemory = false } = await request.json();
    
    if (!prompt) {
      return NextResponse.json({ error: '缺少必要的prompt参数' }, { status: 400 });
    }

    // 根据请求类型生成不同的建议，并传递resetMemory参数
    const suggestion = await generateSummaryFeedback(prompt, resetMemory);
    
    return NextResponse.json({ 
      success: true, 
      suggestion
    });
  } catch (error) {
    console.error('AI建议生成失败:', error);
    return NextResponse.json(
      { error: '处理请求时发生错误', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
