"use client";

import { HabitBO } from '@/app/api/types';
import { DailyQuote } from '@/components/DailyQuote';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarCheck2, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getHabitStats } from '../habits/actions';
import { getHabits } from '../habits/client-actions';
import { DailySummaryViewer } from './daily-summary-viewer';
import { HabitCheckInCard } from './habit-check-in-card';

export default function DashboardPage() {
  // 使用 useState 保存数据
  const [habits, setHabits] = useState<HabitBO[]>([]);
  const [habitStats, setHabitStats] = useState({ overallCompletionRate: 0, periodLabel: '' });
  const [loading, setLoading] = useState(true);

  // 计算习惯完成数据
  const completedHabits = habits.filter(habit => habit.completedToday).length;
  const totalHabits = habits.length;

  // 使用 useEffect 获取数据
  useEffect(() => {
    async function fetchData() {
      try {
        // 获取习惯数据
        const habitsData = await getHabits();
        setHabits(habitsData);

        // 获取习惯统计信息
        const stats = await getHabitStats('week');
        setHabitStats(stats);
      } catch (error) {
        console.error('获取数据失败:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // 加载状态
  if (loading) {
    return <div className="flex justify-center items-center min-h-[50vh]">正在加载数据...</div>;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarCheck2 className="h-6 w-6" />
          <h1 className="text-xl font-semibold">今日概览</h1>
        </div>
      </div>
      {/* 用户信息和每日格言放在同一行 */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* 用户信息部分 */}
        <div className="md:w-1/3">
          {/* 每日规划快速入口 */}
          <Link href="/daily" className="block mb-4">
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer border-dashed">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <ClipboardList className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">前往每日规划</h3>
                    <p className="text-sm text-muted-foreground">安排今日任务，规划时间分配</p>
                  </div>
                </div>
                <div className="text-primary text-sm font-medium">立即前往 →</div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* 每日推荐语录部分 */}
        <div className="md:w-2/3">
          <DailyQuote />
        </div>
      </div>



      {/* 添加日常总结查看器 */}
      <DailySummaryViewer />

      {/* 习惯完成概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">习惯总数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHabits}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalHabits > 0
                ? "继续保持良好习惯"
                : "添加一些习惯开始追踪"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">今日已完成</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedHabits}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalHabits > 0
                ? `完成率 ${Math.round((completedHabits / totalHabits) * 100)}%`
                : "尚未完成任何习惯"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">本周完成率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(habitStats.overallCompletionRate * 100)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {habitStats.periodLabel}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-3">
          <HabitCheckInCard/>
        </div>
      </div>
    </>
  );
}