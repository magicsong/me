"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, CalendarIcon, CheckCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';
import { completeHabit } from '../habits/actions';
import { HabitCalendar } from '../habits/habit-calendar';

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
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const progress = totalCount > 0 ? (completedCount / totalCount * 100) : 0;
  
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
  
  // 处理打卡完成
  async function handleCheckIn(e: React.MouseEvent, habit: Habit) {
    e.stopPropagation(); // 阻止冒泡，避免同时触发打开日历
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
                onClick={(e) => handleCheckIn(e, habit)}
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
        
        {/* 桌面端显示 - 右侧日历 */}
        <div className="hidden md:block md:w-5/12 lg:w-2/5">
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
