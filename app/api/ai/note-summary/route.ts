import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { generateMirrorQuestion } from '@/lib/langchain/mirror-question-generator';
import { generateCacheKey, getCachedLLMResponse, cacheLLMResponse } from '@/lib/cache';

/**
 * 意外之镜 - 生成 AI 反问的 API 端点
 * 接收笔记内容，使用大模型生成深入的反问
 * 返回：笔记ID、笔记内容、AI反问
 * 支持3小时缓存
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

    // 生成缓存键
    const cacheKey = generateCacheKey({
      entity: 'mirror_question',
      content,
      title,
    });

    // 尝试从缓存获取
    const cachedResult = await getCachedLLMResponse(cacheKey, userId);
    if (cachedResult) {
      console.log(`使用缓存的反问，noteId: ${noteId}`);
      
      let aiQuestion;
      try {
        aiQuestion = JSON.parse(cachedResult.response_content);
      } catch {
        // 如果缓存的内容格式不对，继续生成新的
        aiQuestion = await generateMirrorQuestion(content, title, userId);
      }

      return NextResponse.json({
        success: true,
        noteId,
        title,
        content,
        cached: true,
        aiQuestion: {
          mode: aiQuestion.mode,
          question: aiQuestion.question
        }
      });
    }

    // 使用大模型生成 AI 反问
    const aiQuestion = await generateMirrorQuestion(content, title, userId);

    // 缓存结果
    await cacheLLMResponse(
      cacheKey,
      `Mirror question for: ${title}`,
      'mirror-question-generator',
      JSON.stringify(aiQuestion),
      undefined,
      userId
    );

    return NextResponse.json({
      success: true,
      noteId,
      title,
      content,
      cached: false,
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
