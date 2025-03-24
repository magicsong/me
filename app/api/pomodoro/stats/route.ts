import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { pomodoros } from '@../../iac/drizzle/schema'; // 修复导入路径
import { and, eq, gte, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all';

    const now = new Date();
    let query = db.select().from(pomodoros);
    
    // 根据时间段过滤数据
    if (period === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      query = query.where(gte(pomodoros.start_time, today));
    } else if (period === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      query = query.where(gte(pomodoros.start_time, startOfWeek));
    } else if (period === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      query = query.where(gte(pomodoros.start_time, startOfMonth));
    }

    // 执行查询
    const pomodoroItems = await query;
    
    // 计算统计数据
    const total = pomodoroItems.length;
    const completed = pomodoroItems.filter(item => item.status === 'completed').length;
    const canceled = pomodoroItems.filter(item => item.status === 'canceled').length;
    const active = pomodoroItems.filter(item => 
      item.status === 'running' || item.status === 'paused'
    ).length;
    
    // 计算总时间（分钟）
    const totalMinutes = pomodoroItems.reduce((acc, item) => {
      // 只计算已完成的番茄钟时间
      if (item.status === 'completed' && item.duration) {
        return acc + Number(item.duration);
      }
      return acc;
    }, 0);

    return NextResponse.json({
      total,
      completed,
      canceled,
      active,
      totalMinutes
    });
  } catch (error) {
    console.error('获取番茄钟统计数据失败:', error);
    return NextResponse.json(
      { error: '获取统计数据失败', details: error.message },
      { status: 500 }
    );
  }
}
