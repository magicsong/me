"use client";

import { HabitBO, NoteBO } from '@/app/api/types';
import { DailyQuote } from '@/components/DailyQuote';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MirrorOfSerendipity } from '@/components/mirror-of-serendipity';
import { CalendarCheck2, ClipboardList, Globe } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getHabitStats } from '../habits/actions';
import { getHabits } from '../habits/client-actions';
import { DailySummaryViewer } from './daily-summary-viewer';
import { HabitCheckInCard } from './habit-check-in-card';
import { FocusTasksCard } from '@/components/dashboard/focus-tasks-card';
import { AIAdvisoryCard } from '@/components/dashboard/ai-advisory-card';

export default function DashboardPage() {
  // 使用 useState 保存数据
  const [habits, setHabits] = useState<HabitBO[]>([]);
  const [habitStats, setHabitStats] = useState({ overallCompletionRate: 0, periodLabel: '' });
  const [clientIP, setClientIP] = useState<string>('');
  const [notes, setNotes] = useState<NoteBO[]>([]);
  const [loading, setLoading] = useState(true);

  // 计算习惯完成数据
  const completedHabits = habits.filter(habit => habit.completedToday).length;
  const totalHabits = habits.length;

  // 使用 useEffect 获取数据
  useEffect(() => {
    async function fetchData() {
      try {
        // 获取客户端IP
        const ipResponse = await fetch('/api/ip');
        const ipData = await ipResponse.json();
        setClientIP(ipData.ip);

        // 获取习惯数据
        const habitsData = await getHabits();
        setHabits(habitsData);

        // 获取习惯统计信息
        const stats = await getHabitStats('week');
        setHabitStats(stats);

        // 获取几条笔记用于"奇思妙境"展示
        try {
          const notesRes = await fetch('/api/note?pageSize=10');
          const notesJson = await notesRes.json();
          const notesData = notesJson?.data ?? notesJson;
          if (Array.isArray(notesData)) {
            setNotes(notesData);
          }
        } catch (err) {
          console.error('获取笔记失败', err);
        }
      } catch (error) {
        console.error('获取数据失败:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // 处理补一句
  const handleMirrorAddition = async (noteId: number, addition: string) => {
    console.log(`补一句: 笔记 ${noteId}`, addition);
    // TODO: 可以在这里保存到数据库或发送到后端
  };

  // 处理忽略
  const handleMirrorIgnore = async (noteId: number) => {
    console.log(`忽略: 笔记 ${noteId}`);
    // TODO: 可以在这里记录用户的忽略模式，用于后续 AI 分析
  };

  // 加载状态
  if (loading) {
    return <div className="flex justify-center items-center min-h-[50vh]">正在加载数据...</div>;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <CalendarCheck2 className="h-6 w-6" />
          <h1 className="text-xl font-semibold">今日概览</h1>
          <Link 
            href="/daily" 
            className="ml-auto md:ml-4 inline-flex items-center gap-2 px-3 py-1 text-sm rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
          >
            <ClipboardList className="h-4 w-4" />
            <span>每日规划</span>
          </Link>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Globe className="h-4 w-4" />
          <span>IP: {clientIP || '加载中...'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-1">
          <DailyQuote />
        </div>
        <div className="lg:col-span-1">
          <FocusTasksCard maxTasks={3} />
        </div>
        <div className="lg:col-span-1">
          <AIAdvisoryCard 
            habitCompletionRate={Math.round((completedHabits / totalHabits) * 100) || 0}
            notesCount={notes.length}
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="lg:w-2/3">
          <DailySummaryViewer />
        </div>

        <div className="lg:w-1/3">
          <MirrorOfSerendipity 
            userId="current-user"
            notes={notes}
            onAddition={handleMirrorAddition}
            onIgnore={handleMirrorIgnore}
          />
        </div>
      </div>

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
          <HabitCheckInCard />
        </div>
      </div>
    </>
  );
}
