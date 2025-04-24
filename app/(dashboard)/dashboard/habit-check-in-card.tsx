"use client";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';

import { HabitBO } from '@/app/api/types';
import {
  BookOpen,
  CalendarIcon, CheckCheck,
  CheckCircle2, Circle,
  Clock,
  Trophy, XCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation'; // 添加导航钩子
import { useEffect, useState } from 'react';
import { toast } from 'sonner'; // 导入 sonner 的 toast
import { completeHabit } from '../habits/client-actions';
import { HabitCalendar } from '../habits/habit-calendar';
import { DifficultyFeedback } from './components/difficulty-feedback';
import { HabitCompletionDialog } from './components/habit-completion-dialog';
import { HabitFailureDialog } from './components/habit-failure-dialog';
// 难度评估类型
type DifficultyLevel = 'easy' | 'medium' | 'hard' | null;

// 习惯打卡卡片组件
export function HabitCheckInCard() {
  const [animatingHabitId, setAnimatingHabitId] = useState<number | null>(null);
  const [selectedHabit, setSelectedHabit] = useState<HabitBO | null>(null);

  // 添加 habits 状态及相关计数
  const [habits, setHabits] = useState<HabitBO[]>([]);
  const [loading, setLoading] = useState(true);
  const completedCount = habits.filter(h => h.completedToday).length;
  const totalCount = habits.length;
  const progress = totalCount > 0 ? (completedCount / totalCount * 100) : 0;

  // 合并对话框状态
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [currentHabit, setCurrentHabit] = useState<HabitBO | null>(null);

  // 添加失败对话框状态
  const [failureDialogOpen, setFailureDialogOpen] = useState(false);
  const router = useRouter(); // 添加路由跳转钩子

  // ...existing code...

  // 处理开始专注按钮点击
  function handleStartFocus(e: React.MouseEvent, habit: HabitBO) {
    e.stopPropagation(); // 阻止冒泡，避免同时触发打开日历
    // 导航到番茄钟页面，并传递habitId参数
    router.push(`/pomodoro?habitId=${habit.id}`);
  }

  // ...existing code...
  // 获取习惯数据
  async function fetchHabits() {
    setLoading(true);
    try {
      const response = await fetch('/api/habit');
      if (!response.ok) {
        throw new Error('获取习惯数据失败');
      }
      const data = await response.json();
      setHabits(data.data || []);
    } catch (error) {
      console.error('获取习惯数据错误:', error);
      toast.error('获取习惯数据失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  }

  // 组件挂载时获取习惯数据
  useEffect(() => {
    fetchHabits();
  }, []);

  // 默认选择第一个习惯展示日历
  useEffect(() => {
    if (habits.length > 0 && !selectedHabit) {
      setSelectedHabit(habits[0]);
    }
  }, [habits, selectedHabit]);

  // 处理习惯点击 - 显示日历
  const handleHabitClick = (habit: HabitBO) => {
    setSelectedHabit(habit);
  };

  // 处理打卡开始
  function handleCheckInStart(e: React.MouseEvent, habit: HabitBO) {
    e.stopPropagation(); // 阻止冒泡，避免同时触发打开日历
    if (habit.completedToday) return;

    // 打开合并的习惯完成对话框
    setCurrentHabit(habit);
    setCompletionDialogOpen(true);
  }

  // 处理习惯完成提交（合并打卡和难度评估）
  async function handleSubmit(data: {
    habitId: number;
    tierId?: number;
    difficulty: DifficultyLevel;
    comment: string;
  }) {
    setAnimatingHabitId(data.habitId);

    try {
      // 1. 完成打卡
      await completeHabit(data.habitId, { comment: data.comment, difficulty: data.difficulty, tierId: data.tierId });
      // 使用 sonner 显示成功消息
      toast.success("🎉 已完成！继续加油！", {
        duration: 3000,
      });

      // 刷新习惯数据
      fetchHabits();
    } catch (error) {
      console.error('习惯完成提交失败:', error);
      toast.error('习惯完成提交失败，请重试');
    } finally {
      // 动画结束后清除状态
      setTimeout(() => {
        setAnimatingHabitId(null);
      }, 500);
    }
  }

  // 处理习惯失败记录提交
  async function handleFailureSubmit(data: {
    habitId: number;
    failureReason: string;
    comment: string;
    status: 'failed';
  }) {
    setAnimatingHabitId(data.habitId);

    try {
      // 完成打卡或记录失败
      await completeHabit(data.habitId, {
        comment: data.comment,
        failureReason: data.failureReason,
        status: data.status
      });

      toast.info("📝 已记录。每次反思都是成长的机会！", {
        duration: 4000,
      });

      // 刷新习惯数据
      fetchHabits();
    } catch (error) {
      console.error('习惯失败记录提交失败:', error);
      toast.error('提交失败，请重试');
    } finally {
      // 动画结束后清除状态
      setTimeout(() => {
        setAnimatingHabitId(null);
      }, 500);
    }
  }

  return (
    <>
      {/* 合并的习惯完成对话框 */}
      <HabitCompletionDialog
        isOpen={completionDialogOpen}
        onClose={() => setCompletionDialogOpen(false)}
        habit={currentHabit}
        onSubmit={handleSubmit}
      />

      {/* 习惯失败对话框 */}
      <HabitFailureDialog
        isOpen={failureDialogOpen}
        onClose={() => setFailureDialogOpen(false)}
        habit={currentHabit}
        onSubmit={handleFailureSubmit}
      />

      <div className="flex flex-col md:flex-row gap-4 w-full">
        <Card className="flex-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">📅 今日习惯打卡（ {completedCount} / {totalCount} 已完成）</CardTitle>
            </div>
            <div className="flex items-center justify-between mt-2">
              <Progress
                value={progress}
                className="h-2 flex-1"
                style={{
                  background: 'rgba(200, 200, 200, 0.2)',
                  '--progress-background': 'linear-gradient(to right, #5c6bc0, #3949ab)'
                } as React.CSSProperties}
              />
              <span className="text-sm ml-2 text-muted-foreground">{Math.round(progress)}%</span>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                加载中...
              </div>
            ) : habits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                还没有习惯，去添加一些吧！
              </div>
            ) : (
              habits.map((habit) => (
                <motion.div
                  key={habit.id}
                  layout
                  initial={{ scale: 1 }}
                  animate={{
                    scale: animatingHabitId === habit.id ? [1, 1.05, 1] : 1,
                    opacity: habit.completedToday || habit.failedToday ? 0.7 : 1  // 同时处理完成和失败状态
                  }}
                  transition={{ duration: 0.3 }}
                  className={`flex items-center p-3 rounded-md cursor-pointer border ${selectedHabit?.id === habit.id ? 'border-primary bg-primary/5' :
                    habit.completedToday
                      ? 'bg-muted border-muted text-muted-foreground'  // 成功完成的样式
                      : habit.failedToday
                        ? 'bg-red-50/50 border-red-100 text-muted-foreground'  // 失败的样式
                        : 'hover:bg-muted/50'
                    }`}
                  onClick={() => handleHabitClick(habit)}
                >
                  <div className="flex-shrink-0 mr-3">
                    {habit.completedToday ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1, rotate: [0, 15, 0] }}
                        transition={{ duration: 0.4 }}
                      >
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                      </motion.div>
                    ) : habit.failedToday ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.4 }}
                      >
                        <BookOpen className="h-6 w-6 text-amber-500" />
                      </motion.div>
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  {/* 在列表项中显示完成或失败状态 */}
                  <div className="flex-1">
                    <div className="font-medium">{habit.name}</div>
                    {habit.description && (
                      <div className="text-xs text-muted-foreground">{habit.description}</div>
                    )}

                    {/* 显示成功完成 */}
                    {habit.completedToday && habit.completedTier && (
                      <div className="flex items-center gap-1 mt-1">
                        <Trophy className="h-3 w-3 text-amber-500" />
                        <span className="text-xs font-medium text-amber-600">
                          挑战已完成: {habit.challengeTiers?.find(tier => tier.id === habit.completedTier)?.name || 'Unknown'}
                        </span>
                        <Badge variant="outline" className="text-xs ml-1 h-5 px-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100">
                          +{habit.challengeTiers?.find(tier => tier.id === habit.completedTier)?.reward_points || 'Unknown'}
                        </Badge>
                      </div>
                    )}

                    {/* 显示失败记录 */}
                    {habit.failedToday && (
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        <div className="bg-blue-50 text-blue-700 rounded-md px-2 py-0.5 text-xs flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          <span className="font-medium">已记录</span>
                          {habit.failureReason && (
                            <span className="ml-1 text-blue-600/70">- {habit.failureReason}</span>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs h-5 px-1.5 bg-amber-50 text-amber-700">
                          成长机会
                        </Badge>
                      </div>
                    )}

                    {/* 添加难度建议显示 */}
                    {habit.completedToday && (
                      <DifficultyFeedback habitId={String(habit.id)} habitName={habit.name} />
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-sm text-muted-foreground">
                      {habit.streak > 0 && `${habit.streak}天`}
                    </div>
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />

                    {!habit.completedToday && !habit.failedToday && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={(e) => handleCheckInStart(e, habit)}
                        >
                          <CheckCheck className="h-4 w-4 mr-1" />
                          打卡
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8"
                          onClick={(e) => handleStartFocus(e, habit)}
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          专注
                        </Button>
                        <Button
                          variant="destructive"  // 使用更醒目的样式
                          size="sm"
                          className="h-8"
                          onClick={(e) => {
                            e.stopPropagation(); // 阻止冒泡
                            setCurrentHabit(habit);
                            setFailureDialogOpen(true);
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-1" />失败了
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>

        {/* 移动端显示 - 展开收起式日历 */}
        <div className="block md:hidden w-full">
          {selectedHabit && (
            <Card className="w-full">
              <HabitCalendar
                habit={selectedHabit}
                onClose={() => setSelectedHabit(null)}
              />
            </Card>
          )}
        </div>

        {/* 桌面端显示 - 右侧内容 */}
        <div className="hidden md:flex md:flex-col md:w-5/12 lg:w-2/5 gap-4">
          {/* 日历卡片 */}
          {selectedHabit && (
            <Card className="w-full">
              <HabitCalendar
                habit={selectedHabit}
                onClose={() => { }}
                className="sticky top-20 w-full"
              />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}