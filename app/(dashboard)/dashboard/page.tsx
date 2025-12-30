"use client";

import { HabitBO, NoteBO } from '@/app/api/types';
import { DailyQuote } from '@/components/DailyQuote';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarCheck2, ClipboardList, Globe } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getHabitStats } from '../habits/actions';
import { getHabits } from '../habits/client-actions';
import { DailySummaryViewer } from './daily-summary-viewer';
import { HabitCheckInCard } from './habit-check-in-card';
import { getNoteAISummary } from './note-ai-client';

export default function DashboardPage() {
  // 使用 useState 保存数据
  const [habits, setHabits] = useState<HabitBO[]>([]);
  const [habitStats, setHabitStats] = useState({ overallCompletionRate: 0, periodLabel: '' });
  const [clientIP, setClientIP] = useState<string>('');
  const [notes, setNotes] = useState<NoteBO[]>([]);
  const [noteSummaries, setNoteSummaries] = useState<Record<number | string, { summary: string; reason: string }>>({});
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

        // 获取几条笔记用于“笔记精选”展示（使用现有 note API）
        try {
          const notesRes = await fetch('/api/note?pageSize=3');
          const notesJson = await notesRes.json();
          const notesData = notesJson?.data ?? notesJson;
          if (Array.isArray(notesData)) {
            setNotes(notesData);

            // 为每条笔记请求 AI 推荐理由（并行）
            const aiTasks = notesData.map(async (n: NoteBO) => {
              const ai = await getNoteAISummary(n.id as number, n.content, n.title);
              return { id: n.id, ai };
            });

            const results = await Promise.all(aiTasks);
            const map: Record<number | string, { summary: string; reason: string }> = {};
            results.forEach((r) => {
              map[r.id] = {
                summary: r.ai?.summary ?? '',
                reason: r.ai?.reason ?? '',
              };
            });
            setNoteSummaries(map);
          }
        } catch (err) {
          console.error('获取笔记或 AI 推荐失败', err);
        }
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
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Globe className="h-4 w-4" />
          <span>IP: {clientIP || '加载中...'}</span>
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



      {/* 日常总结与笔记精选并列展示 */}
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="lg:w-2/3">
          <DailySummaryViewer />
        </div>

        <div className="lg:w-1/3">
          <Card className="overflow-hidden">
            <div className="h-1.5 w-full rainbow-flow rounded-t-md" />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">笔记精选</CardTitle>
            </CardHeader>
            <CardContent>
              {!notes || notes.length === 0 ? (
                <div className="text-sm text-muted-foreground">暂无笔记</div>
              ) : (
                (() => {
                  const note = notes[0];
                  const ai = noteSummaries[note.id ?? ''];
                  const createdAt = note.createdAt || note.updatedAt || new Date().toISOString();
                  const fmt = new Date(createdAt).toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short' });

                  return (
                    <div className="space-y-3">
                      <div className="text-xs text-muted-foreground">{fmt}</div>
                      <h3 className="text-lg font-semibold">{note.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-3">{note.content ?? ''}</p>

                      <div className="pt-2 border-t">
                        <div className="text-sm font-medium">AI 推荐理由</div>
                        <p className="text-sm text-muted-foreground italic mt-1">{ai?.reason ?? 'AI 推荐中...'}</p>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-1 rainbow-pill">回忆</span>
                          <span className="text-xs text-muted-foreground">提醒 • 保存为回忆</span>
                        </div>
                        <Link href={`/note/${note.id}`} className="text-sm text-primary">查看完整 →</Link>
                      </div>
                    </div>
                  );
                })()
              )}
            </CardContent>
          </Card>
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
          <HabitCheckInCard/>
        </div>
      </div>
    </>
  );
}