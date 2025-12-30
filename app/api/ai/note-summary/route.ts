import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { generateMirrorQuestion } from '@/lib/langchain/mirror-question-generator';

/**
 * 意外之镜 - 生成 AI 反问的 API 端点
 * 接收笔记内容，使用大模型生成深入的反问
 * 返回：笔记ID、笔记内容、AI反问
 */
export async function POST(request: NextRequest) {
  try {
    // 权限检查
    const session = await auth();
    const userId = session?.user?.id || 'anonymous';

    // 解析请求内容
    const { noteId, title, content } = await request.json();
    
    if (!noteId || !title || !content) {
      return NextResponse.json(
        { error: '缺少必要参数：noteId、title、content' },
        { status: 400 }
      );
    }

    console.log(`Generating Mirror of Serendipity question for note ${noteId}`);

    // 使用大模型生成 AI 反问
    const aiQuestion = await generateMirrorQuestion(content, title, userId);

    return NextResponse.json({
      success: true,
      noteId,
      title,
      content,
      aiQuestion: {
        mode: aiQuestion.mode,
        question: aiQuestion.question
      }
    });
  } catch (error) {
    console.error('生成意外之镜反问失败:', error);
    return NextResponse.json(
      {
        error: '处理请求时发生错误',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
