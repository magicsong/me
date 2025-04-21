import { NextRequest, NextResponse } from 'next/server';
import { generateContent } from '@/lib/langchain/memory';

export async function POST(request: NextRequest) {
  try {
    const { userId, sessionId, input, memoryParams } = await request.json();
    
    if (!userId || !sessionId || !input) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }
    
    const response = await generateContent({
      userId,
      sessionId,
      input,
      memoryParams,
    });
    
    return NextResponse.json({ response });
  } catch (error) {
    console.error("聊天API错误:", error);
    return NextResponse.json({ error: "请求处理失败" }, { status: 500 });
  }
}