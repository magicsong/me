import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { 
  getAiInsightById, 
  updateAiInsight, 
  deleteAiInsight 
} from '@/lib/db/ai-insight';
import { UpdateInsightData } from '@/lib/types/ai-insight';

// 获取单个 AI 洞察
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 权限检查
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权：需要用户登录' }, { status: 401 });
    }
    
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: '无效的ID' }, { status: 400 });
    }
    
    const result = await getAiInsightById(id);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'AI洞察不存在' }, { status: 404 });
    }
    
    // 验证权限 - 只能查看自己的洞察
    if (result.data && result.data.user_id !== session.user.id) {
      return NextResponse.json({ error: '无权访问此洞察' }, { status: 403 });
    }
    
    return NextResponse.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('获取AI洞察详情失败:', error);
    return NextResponse.json(
      { error: '处理请求时发生错误', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// 更新 AI 洞察
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 权限检查
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权：需要用户登录' }, { status: 401 });
    }
    
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: '无效的ID' }, { status: 400 });
    }
    
    // 先获取洞察，确认存在并验证权限
    const existingInsight = await getAiInsightById(id);
    
    if (!existingInsight.success || !existingInsight.data) {
      return NextResponse.json({ error: 'AI洞察不存在' }, { status: 404 });
    }
    
    if (existingInsight.data.user_id !== session.user.id) {
      return NextResponse.json({ error: '无权修改此洞察' }, { status: 403 });
    }
    
    const updateData = await request.json();
    
    // 防止修改用户ID
    delete updateData.user_id;
    
    const result = await updateAiInsight(id, updateData as UpdateInsightData);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error || '更新AI洞察失败' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('更新AI洞察失败:', error);
    return NextResponse.json(
      { error: '处理请求时发生错误', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// 删除 AI 洞察
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 权限检查
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权：需要用户登录' }, { status: 401 });
    }
    
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json({ error: '无效的ID' }, { status: 400 });
    }
    
    // 先获取洞察，确认存在并验证权限
    const existingInsight = await getAiInsightById(id);
    
    if (!existingInsight.success || !existingInsight.data) {
      return NextResponse.json({ error: 'AI洞察不存在' }, { status: 404 });
    }
    
    if (existingInsight.data.user_id !== session.user.id) {
      return NextResponse.json({ error: '无权删除此洞察' }, { status: 403 });
    }
    
    const result = await deleteAiInsight(id);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error || '删除AI洞察失败' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: '洞察已成功删除'
    });
  } catch (error) {
    console.error('删除AI洞察失败:', error);
    return NextResponse.json(
      { error: '处理请求时发生错误', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
