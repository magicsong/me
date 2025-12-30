import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { generateNoteSummary } from '@/lib/langchain/note-summary-generator';

/**
 * 生成笔记 AI 摘要和推荐理由的 API 端点
 */
export async function POST(request: NextRequest) {
  try {
    // 权限检查（可选，如果需要用户登录）
    const session = await auth();
    const userId = session?.user?.id;

    // 解析请求内容
    const { noteId, title, content } = await request.json();
    
    if (!noteId || !title || !content) {
      return NextResponse.json(
        { error: '缺少必要参数：noteId、title、content' },
        { status: 400 }
      );
    }

    console.log(`Generating summary for note ${noteId}`);

    // 调用AI生成摘要和推荐理由
    const result = await generateNoteSummary(noteId, title, content, userId);

    return NextResponse.json({
      success: true,
      summary: result.summary,
      reason: result.reason,
      keyPoints: result.keyPoints || []
    });
  } catch (error) {
    console.error('笔记摘要生成失败:', error);
    return NextResponse.json(
      {
        error: '处理请求时发生错误',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
