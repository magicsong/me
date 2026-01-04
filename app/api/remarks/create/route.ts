import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { createRemark } from '@/lib/db-remarks';

/**
 * 保存笔记的补充内容（remark）
 * 通用的remark保存端点
 */
export async function POST(request: NextRequest) {
  try {
    // 权限检查
    const session = await auth();
    const userId = session?.user?.id || 'anonymous';

    // 解析请求内容
    const { entity_type, entity_id, content } = await request.json();
    
    if (!entity_type || !entity_id || !content) {
      return NextResponse.json(
        { error: '缺少必要参数：entity_type、entity_id、content' },
        { status: 400 }
      );
    }

    console.log(`保存remark: ${entity_type} ${entity_id} by user ${userId}`);

    // 创建remark
    const remark = await createRemark(userId, {
      entity_type,
      entity_id,
      content,
    });

    return NextResponse.json({
      success: true,
      data: remark,
    });
  } catch (error) {
    console.error('保存remark失败:', error);
    return NextResponse.json(
      {
        error: '处理请求时发生错误',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
