"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, BarChart3, ArrowUp, ArrowDown, Calendar } from 'lucide-react';
import { getHabitStats } from './actions';
import { Progress } from '@/components/ui/progress';

type HabitStat = {
  id: string;
  name: string;
  completionRate: number;
  streak: number;
  totalCompletions: number;
  missedDays: number;
};

type StatsData = {
  overallCompletionRate: number;
  periodLabel: string;
  bestHabit: HabitStat | null;
  worstHabit: HabitStat | null;
  habitStats: HabitStat[];
  dailyTrend: { date: string; completionRate: number }[];
};

export function HabitStats() {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('week');
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    async function loadStats() {
      setIsLoading(true);
      try {
        const data = await getHabitStats(timeRange);
        setStats(data);
      } catch (error) {
        console.error('加载统计数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, [timeRange]);

  // 如果没有数据或正在加载，显示加载状态
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            习惯统计
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 如果没有习惯数据
  if (!stats || !stats.habitStats.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            习惯统计
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>当你开始记录习惯，这里将显示你的进度统计</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-xl flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          习惯统计
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="week">本周</TabsTrigger>
            <TabsTrigger value="month">本月</TabsTrigger>
            <TabsTrigger value="quarter">本季度</TabsTrigger>
            <TabsTrigger value="year">今年</TabsTrigger>
          </TabsList>
          
          <TabsContent value={timeRange} className="space-y-4 pt-4">
            {/* 总体完成率 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium">总体完成率</h3>
                <span className="text-sm font-bold">{Math.round(stats.overallCompletionRate * 100)}%</span>
              </div>
              <Progress value={stats.overallCompletionRate * 100} className="h-2" />
            </div>
            
            {/* 最佳和最差习惯 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.bestHabit && (
                <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-md border border-green-200 dark:border-green-900">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-1">
                    <ArrowUp className="h-4 w-4" />
                    <h3 className="font-medium">最佳习惯</h3>
                  </div>
                  <p className="font-bold">{stats.bestHabit.name}</p>
                  <div className="mt-1 flex flex-col text-xs text-green-600 dark:text-green-500">
                    <span>完成率: {Math.round(stats.bestHabit.completionRate * 100)}%</span>
                    <span>连续天数: {stats.bestHabit.streak}天</span>
                  </div>
                </div>
              )}
              
              {stats.worstHabit && (
                <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-md border border-red-200 dark:border-red-900">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-1">
                    <ArrowDown className="h-4 w-4" />
                    <h3 className="font-medium">需要加强</h3>
                  </div>
                  <p className="font-bold">{stats.worstHabit.name}</p>
                  <div className="mt-1 flex flex-col text-xs text-red-600 dark:text-red-500">
                    <span>完成率: {Math.round(stats.worstHabit.completionRate * 100)}%</span>
                    <span>错过天数: {stats.worstHabit.missedDays}天</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* 详细统计 - 只在展开时显示 */}
            {isExpanded && (
              <>
                {/* 趋势图 */}
                {stats.dailyTrend && stats.dailyTrend.length > 0 && (
                  <div className="pt-4">
                    <h3 className="text-sm font-medium mb-3">完成趋势 ({stats.periodLabel})</h3>
                    <div className="h-32 flex items-end gap-1">
                      {stats.dailyTrend.map((day, index) => (
                        <div key={index} className="flex flex-col items-center flex-1">
                          <div 
                            className="w-full bg-primary/80 rounded-t-sm" 
                            style={{ height: `${Math.max(4, day.completionRate * 100)}%` }}
                          ></div>
                          <span className="text-xs text-muted-foreground mt-1 truncate" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', height: '1rem' }}>
                            {day.date}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* 所有习惯进度 */}
                <div className="pt-4">
                  <h3 className="text-sm font-medium mb-3">所有习惯进度</h3>
                  <div className="space-y-3">
                    {stats.habitStats.slice().sort((a, b) => b.completionRate - a.completionRate).map((habit) => (
                      <div key={habit.id} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm truncate max-w-[180px]">{habit.name}</span>
                          <span className="text-xs font-medium">{Math.round(habit.completionRate * 100)}%</span>
                        </div>
                        <Progress value={habit.completionRate * 100} className="h-1.5" />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
