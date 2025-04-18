"use client";

import { Badge } from '@/components/ui/badge'; // 添加 Badge 导入
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarIcon, CheckCheck,
  CheckCircle2, Circle,
  Trophy
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { completeHabit, getHabitDifficultyHistory, saveHabitDifficulty } from '../habits/actions';
import { HabitCalendar } from '../habits/habit-calendar';
import { checkSummaryCompletion } from './actions';
import { HabitCompletionDialog } from './components/habit-completion-dialog'; // 添加这一行导入

// 导入类型定义
type Habit = {
  id: number;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  createdAt: string;
  completedToday: boolean;
  streak: number;
  challenge_tiers?: ChallengeTier[];
  completed_tier?: CompletedTier | null;
};

// 挑战阶梯类型
type ChallengeTier = {
  id: number;
  name: string;
  level: number;
  description?: string;
  reward_points: number;
};

// 完成的挑战阶梯类型
type CompletedTier = {
  id: number;
  name: string;
  level: number;
  reward_points: number;
};

// 难度评估类型
type DifficultyLevel = 'easy' | 'medium' | 'hard' | null;

// Toast 通知组件
function Toast({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-md shadow-lg"
    >
      {message}
    </motion.div>
  );
}

// 难度调整建议组件
function DifficultyFeedback({ habitId, habitName }: { habitId: string, habitName: string }) {
  const [difficultyHistory, setDifficultyHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function loadDifficultyData() {
      try {
        const data = await getHabitDifficultyHistory(Number(habitId));
        setDifficultyHistory(data);
      } catch (error) {
        console.error('加载难度数据失败:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadDifficultyData();
  }, [habitId]);
  
  if (loading || !difficultyHistory) return null;
  
  // 根据最近的难度评估提供建议
  const { easy, medium, hard, lastFive, recentEvaluations } = difficultyHistory;
  const total = easy + medium + hard;
  
  if (total < 3) return null; // 数据不足
  
  // 计算最近5次评估中各难度的比例
  const lastFiveCount = {
    easy: lastFive.filter(d => d === 'easy').length,
    medium: lastFive.filter(d => d === 'medium').length,
    hard: lastFive.filter(d => d === 'hard').length
  };
  
  let suggestion = null;
  let color = '';
  
  if (lastFiveCount.easy >= 3) {
    // 绿色区（太简单）
    suggestion = `「${habitName}」对你来说变得容易了！考虑提升10%-20%的难度，例如增加数量或提高质量要求。`;
    color = 'text-green-600';
  } else if (lastFiveCount.hard >= 3) {
    // 红色区（过度困难）
    suggestion = `「${habitName}」似乎有些困难，建议拆分步骤或降低要求，设定更容易达成的小目标。`;
    color = 'text-red-600';
  } else if (lastFiveCount.medium >= 3) {
    // 黄色区（理想边缘）
    suggestion = `「${habitName}」难度适中，正处于成长区间，继续保持这个节奏！`;
    color = 'text-yellow-600';
  }
  
  // 获取最近一次评价
  const latestComment = recentEvaluations && recentEvaluations[0]?.comment;
  
  if (!suggestion) return null;
  
  return (
    <div className={`mt-1 text-xs ${color}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className="cursor-help underline decoration-dotted">
            习惯建议
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>{suggestion}</p>
            {latestComment && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <p className="font-medium text-xs">最近评价:</p>
                <p className="text-xs italic">"{latestComment}"</p>
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

// 习惯打卡卡片组件
export function HabitCheckInCard({ 
  habits, 
  completedCount, 
  totalCount 
}: { 
  habits: Habit[]; 
  completedCount: number;
  totalCount: number;
}) {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const [animatingHabitId, setAnimatingHabitId] = useState<number | null>(null);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const progress = totalCount > 0 ? (completedCount / totalCount * 100) : 0;
  
  // 合并对话框状态
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [currentHabit, setCurrentHabit] = useState<Habit | null>(null);
     
  // 默认选择第一个习惯展示日历
  useEffect(() => {
    if (habits.length > 0 && !selectedHabit) {
      setSelectedHabit(habits[0]);
    }
  }, [habits, selectedHabit]);

  // 处理习惯点击 - 显示日历
  const handleHabitClick = (habit: Habit) => {
    setSelectedHabit(habit);
  };
  
  // 处理打卡开始
  function handleCheckInStart(e: React.MouseEvent, habit: Habit) {
    e.stopPropagation(); // 阻止冒泡，避免同时触发打开日历
    if (habit.completedToday) return;
    
    // 打开合并的习惯完成对话框
    setCurrentHabit(habit);
    setCompletionDialogOpen(true);
  }
  
  // 处理打卡完成
  async function handleCheckIn(habitId: number, tierId?: number) {
    setAnimatingHabitId(habitId);
    
    try {
      // 完成打卡，可能带有特定的挑战阶梯ID
      await completeHabit(habitId, tierId);
      
      setToast("🎉 已完成！继续加油！");
      
      // 3秒后清除通知
      setTimeout(() => {
        setToast(null);
      }, 3000);
      
      // 刷新页面数据
      router.refresh();
    } catch (error) {
      console.error('打卡失败:', error);
    } finally {
      // 动画结束后清除状态
      setTimeout(() => {
        setAnimatingHabitId(null);
      }, 500);
    }
  }
  
  // 处理难度评估确认
  async function handleDifficultySubmit(difficulty: DifficultyLevel, comment: string) {
    if (currentHabit && difficulty) {
      try {
        // 保存难度评估
        await saveHabitDifficulty(String(currentHabit.id), difficulty, comment);
        // 刷新数据
        router.refresh();
      } catch (error) {
        console.error('保存难度评估失败:', error);
      }
    }
  }

  return (
    <>
      <AnimatePresence>
        {toast && <Toast message={toast} />}
      </AnimatePresence>
      
      {/* 合并的习惯完成对话框 */}
      <HabitCompletionDialog 
        isOpen={completionDialogOpen}
        onClose={() => setCompletionDialogOpen(false)}
        habit={currentHabit}
        onComplete={handleCheckIn}
        onDifficultySubmit={handleDifficultySubmit}
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
            {habits.length === 0 ? (
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
                    opacity: habit.completedToday ? 0.7 : 1
                  }}
                  transition={{ duration: 0.3 }}
                  className={`flex items-center p-3 rounded-md cursor-pointer border ${
                    selectedHabit?.id === habit.id ? 'border-primary bg-primary/5' :
                    habit.completedToday 
                      ? 'bg-muted border-muted text-muted-foreground' 
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
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="font-medium">{habit.name}</div>
                    {habit.description && (
                      <div className="text-xs text-muted-foreground">{habit.description}</div>
                    )}
                    
                    {/* 显示已完成的挑战级别 */}
                    {habit.completedToday && habit.completed_tier && (
                      <div className="flex items-center gap-1 mt-1">
                        <Trophy className="h-3 w-3 text-amber-500" />
                        <span className="text-xs font-medium text-amber-600">
                          挑战已完成: {habit.completed_tier.name}
                        </span>
                        <Badge variant="outline" className="text-xs ml-1 h-5 px-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100">
                          +{habit.completed_tier.reward_points}
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
                    
                    {!habit.completedToday && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="ml-2 h-8"
                        onClick={(e) => handleCheckInStart(e, habit)}
                      >
                        <CheckCheck className="h-4 w-4 mr-1" />
                        打卡
                      </Button>
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
                onClose={() => {}} 
                className="sticky top-20 w-full"
              />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
