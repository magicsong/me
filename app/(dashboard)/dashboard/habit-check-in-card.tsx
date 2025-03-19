"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';
import { completeHabit } from '../habits/actions';

// 导入类型定义
type Habit = {
  id: string;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  createdAt: string;
  completedToday: boolean;
  streak: number;
};

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
  const [animatingHabitId, setAnimatingHabitId] = useState<string | null>(null);
  const progress = totalCount > 0 ? (completedCount / totalCount * 100) : 0;
  
  // 处理打卡完成
  async function handleCheckIn(habit: Habit) {
    if (habit.completedToday) return;
    
    setAnimatingHabitId(habit.id);
    
    try {
      await completeHabit(habit.id);
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

  return (
    <>
      <AnimatePresence>
        {toast && <Toast message={toast} />}
      </AnimatePresence>
      
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">📅 今日习惯打卡（{completedCount}/{totalCount} 已完成）</CardTitle>
          </div>
          <Progress value={progress} className="h-2 mt-2" />
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
                  habit.completedToday 
                    ? 'bg-muted border-muted text-muted-foreground' 
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => handleCheckIn(habit)}
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
                </div>
                
                <div className="text-sm text-muted-foreground">
                  {habit.completedToday ? '已打卡' : '未打卡'}
                </div>
              </motion.div>
            ))
          )}
        </CardContent>
      </Card>
    </>
  );
}
