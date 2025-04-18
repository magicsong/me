import { NextRequest, NextResponse } from 'next/server';
import { HabitEntryService } from '@/lib/persist/habit-entry';
import { db } from '@/lib/db';
import { habit_challenge_tiers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentUserId } from '@/lib/utils';

// 获取习惯的所有挑战阶梯
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId()

    const { searchParams } = new URL(request.url);
    const habitId = searchParams.get('habitId');
    
    if (!habitId) {
      return NextResponse.json(
        { success: false, error: '缺少习惯ID' }, 
        { status: 400 }
      );
    }
    
    const habitEntryService = new HabitEntryService();
    const tiers = await habitEntryService.getHabitTiers(Number(habitId));
    
    return NextResponse.json({ success: true, data: tiers });
  } catch (error: any) {
    console.error('获取挑战阶梯失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取挑战阶梯失败' },
      { status: 500 }
    );
  }
}

// 创建或更新习惯挑战阶梯
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId()

    const { habitId, name, level, description, rewardPoints, completionCriteria } = await request.json();
    
    if (!habitId || !name || !level) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' }, 
        { status: 400 }
      );
    }
    
    const [tier] = await db.insert(habit_challenge_tiers).values({
      habit_id: Number(habitId),
      name: name,
      level: Number(level),
      description: description || null,
      reward_points: Number(rewardPoints) || 5,
      completion_criteria: completionCriteria || {},
      user_id: session.user.id,
    }).returning();
    
    return NextResponse.json({ success: true, data: tier });
  } catch (error: any) {
    console.error('创建挑战阶梯失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '创建挑战阶梯失败' },
      { status: 500 }
    );
  }
}

// 删除习惯挑战阶梯
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tierId = searchParams.get('id');
    
    if (!tierId) {
      return NextResponse.json(
        { success: false, error: '缺少阶梯ID' }, 
        { status: 400 }
      );
    }
    
    await db.delete(habit_challenge_tiers).where(eq(habit_challenge_tiers.id, Number(tierId)));
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('删除挑战阶梯失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '删除挑战阶梯失败' },
      { status: 500 }
    );
  }
}
