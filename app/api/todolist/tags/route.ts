import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { pomodoro_tags } from '@../../iac/drizzle/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权：需要用户登录' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // 获取当前用户的所有标签
    const tags = await db
      .select()
      .from(pomodoro_tags)
      .where(eq(pomodoro_tags.user_id, userId))
      .orderBy(pomodoro_tags.name);
    
    return NextResponse.json(tags);
  } catch (error) {
    console.error('获取标签失败:', error);
    return NextResponse.json(
      { error: '获取标签失败', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权：需要用户登录' }, { status: 401 });
    }
    
    const userId = session.user.id;
    const { name, color = '#3B82F6' } = await request.json();
    
    if (!name || !name.trim()) {
      return NextResponse.json({ error: '标签名称不能为空' }, { status: 400 });
    }
    
    // 创建新标签
    const [newTag] = await db
      .insert(pomodoro_tags)
      .values({
        name: name.trim(),
        color,
        user_id: userId
      })
      .returning();
    
    return NextResponse.json(newTag);
  } catch (error) {
    console.error('创建标签失败:', error);
    return NextResponse.json(
      { error: '创建标签失败', details: error.message },
      { status: 500 }
    );
  }
}
