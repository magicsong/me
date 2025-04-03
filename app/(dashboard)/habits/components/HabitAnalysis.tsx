'use client';

import { useState, useEffect } from 'react';
import { getHabitAnalysis } from '../api';
import { getHabits } from '../actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface HabitOption {
  id: string;
  name: string;
}

interface HabitAnalysisResult {
  suggestions: {
    overview: string;
    strengths: string[];
    improvements: string[];
    recommendations: {
      title: string;
      description: string;
      actionable: string;
    }[];
  };
  meta: {
    timeRange: string;
    habitName: string;
    completionRate: number;
    streak: number;
    maxStreak: number;
  };
  context: {
    dailyRecords: {
      date: string;
      completed: boolean;
      difficulty?: number;
      comment?: string;
    }[];
    summary: {
      totalDays: number;
      completedDays: number;
      averageDifficulty?: number;
    };
  };
}

export default function HabitAnalysis() {
  const [habits, setHabits] = useState<HabitOption[]>([]);
  const [selectedHabit, setSelectedHabit] = useState<string>('');
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [detailLevel, setDetailLevel] = useState<'simple' | 'standard' | 'detailed'>('standard');
  const [includePersonality, setIncludePersonality] = useState<boolean>(false);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HabitAnalysisResult | null>(null);

  useEffect(() => {
    async function fetchHabits() {
      try {
        const habitsList = await getHabits();
        setHabits(habitsList.map(habit => ({
          id: habit.id,
          name: habit.name
        })));
      } catch (error) {
        console.error('获取习惯列表失败:', error);
        setError('无法加载习惯列表');
      }
    }

    fetchHabits();
  }, []);

  async function handleAnalyze() {
    if (!selectedHabit) {
      setError('请选择一个习惯');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const analysisResult = await getHabitAnalysis({
        habitId: selectedHabit,
        timeRange,
        detailLevel,
        includePersonality,
        customPrompt: customPrompt.trim() || undefined,
      });
      setResult(analysisResult);
    } catch (err: any) {
      setError(err.message || '分析失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>习惯分析</CardTitle>
          <CardDescription>获取关于你习惯培养的AI个性化建议</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="habit">选择习惯</Label>
                <Select
                  value={selectedHabit}
                  onValueChange={setSelectedHabit}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择一个习惯" />
                  </SelectTrigger>
                  <SelectContent>
                    {habits.map(habit => (
                      <SelectItem key={habit.id} value={habit.id}>
                        {habit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeRange">时间范围</Label>
                <Select
                  value={timeRange}
                  onValueChange={(value: any) => setTimeRange(value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择时间范围" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">今日</SelectItem>
                    <SelectItem value="week">本周</SelectItem>
                    <SelectItem value="month">本月</SelectItem>
                    <SelectItem value="year">本年</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="detailLevel">详细程度</Label>
                <Select
                  value={detailLevel}
                  onValueChange={(value: any) => setDetailLevel(value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择详细程度" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">简洁</SelectItem>
                    <SelectItem value="standard">标准</SelectItem>
                    <SelectItem value="detailed">详细</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 pt-8">
                <Switch
                  id="personality"
                  checked={includePersonality}
                  onCheckedChange={setIncludePersonality}
                  disabled={isLoading}
                />
                <Label htmlFor="personality">使用个性化语言</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customPrompt">自定义提示（可选）</Label>
              <Textarea
                id="customPrompt"
                placeholder="例如：请关注我的周末表现，或者专注分析特定习惯..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                disabled={isLoading}
                className="h-20"
              />
            </div>

            {error && <p className="text-red-500">{error}</p>}

            <Button onClick={handleAnalyze} disabled={isLoading}>
              {isLoading ? '分析中...' : '开始分析'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-16 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-16 w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>习惯总览：{result.meta.habitName}</CardTitle>
                <div className="flex items-center space-x-2">
                  <span>完成率: {(result.meta.completionRate * 100).toFixed(1)}%</span>
                  <Progress value={result.meta.completionRate * 100} className="w-24" />
                </div>
              </div>
              <CardDescription>
                连续坚持: {result.meta.streak}天 | 历史最长: {result.meta.maxStreak}天
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert">
                <h3>总体评价</h3>
                <p>{result.suggestions.overview}</p>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="strengths">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="strengths">优势</TabsTrigger>
              <TabsTrigger value="improvements">需要改进</TabsTrigger>
              <TabsTrigger value="recommendations">具体建议</TabsTrigger>
            </TabsList>
            
            <TabsContent value="strengths">
              <Card>
                <CardContent className="pt-6">
                  <ul className="space-y-2">
                    {result.suggestions.strengths.map((strength, index) => (
                      <li key={index} className="flex items-start">
                        <span className="inline-flex items-center justify-center rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 h-6 w-6 mr-2 text-sm">
                          ✓
                        </span>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="improvements">
              <Card>
                <CardContent className="pt-6">
                  <ul className="space-y-2">
                    {result.suggestions.improvements.map((improvement, index) => (
                      <li key={index} className="flex items-start">
                        <span className="inline-flex items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900 text-amber-600 dark:text-amber-300 h-6 w-6 mr-2 text-sm">
                          !
                        </span>
                        <span>{improvement}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="recommendations">
              <div className="space-y-4">
                {result.suggestions.recommendations.map((rec, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-lg">{rec.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p>{rec.description}</p>
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground mb-1">可执行步骤:</h4>
                        <p className="text-sm bg-muted p-3 rounded-md">{rec.actionable}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <Card>
            <CardHeader>
              <CardTitle>打卡数据可视化</CardTitle>
              <CardDescription>最近{result.context.dailyRecords.length}天的打卡记录</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {result.context.dailyRecords.map((record) => {
                  const date = new Date(record.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
                  return (
                    <div key={record.date} className="text-center">
                      <Badge 
                        variant={record.completed ? "default" : "outline"}
                        className={`w-10 h-10 flex items-center justify-center ${record.completed ? 'bg-green-500' : 'border-dashed'}`}
                        title={record.difficulty ? `难度: ${record.difficulty}/5` : undefined}
                      >
                        {record.completed ? "✓" : "✗"}
                      </Badge>
                      <span className="text-xs block mt-1">{date}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
