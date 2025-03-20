"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getHabitHistory } from './actions';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Habit = {
  id: string;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  createdAt: string;
  completedToday: boolean;
  streak: number;
};

type DateValue = string | Date;

// 日历组件
export function HabitCalendar({
  habit,
  onClose,
  className
}: {
  habit: Habit | null;
  onClose: () => void;
  className?: string;
}) {
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [completedDates, setCompletedDates] = useState<Date[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 加载习惯历史数据
  useEffect(() => {
    if (!habit) return;

    async function loadHabitHistory() {
      setIsLoading(true);
      try {
        const history = await getHabitHistory(habit.id);
        setCompletedDates(history.map((date: DateValue) => 
          date instanceof Date ? date : new Date(date)
        ));
      } catch (error) {
        console.error('Error loading habit history:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadHabitHistory();
  }, [habit]);

  if (!habit) return null;

  // 切换到前一个时间范围
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
      case 'quarter':
        newDate.setMonth(newDate.getMonth() - 3);
        break;
      case 'year':
        newDate.setFullYear(newDate.getFullYear() - 1);
        break;
    }
    setCurrentDate(newDate);
  };

  // 切换到后一个时间范围
  const goToNext = () => {
    const newDate = new Date(currentDate);
    switch (viewMode) {
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      case 'quarter':
        newDate.setMonth(newDate.getMonth() + 3);
        break;
      case 'year':
        newDate.setFullYear(newDate.getFullYear() + 1);
        break;
    }
    setCurrentDate(newDate);
  };

  // 格式化显示当前时间范围
  const formatDateRange = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.toLocaleString('default', { month: 'long' });
    
    switch (viewMode) {
      case 'week': {
        // 获取当前周的第一天和最后一天
        const startOfWeek = new Date(currentDate);
        const day = currentDate.getDay() || 7; // 将0(周日)转换为7
        startOfWeek.setDate(currentDate.getDate() - day + 1);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        return `${startOfWeek.getFullYear()}年${startOfWeek.getMonth() + 1}月${startOfWeek.getDate()}日 - ${endOfWeek.getMonth() + 1}月${endOfWeek.getDate()}日`;
      }
      case 'month':
        return `${year}年${month}`;
      case 'quarter': {
        const quarter = Math.floor(currentDate.getMonth() / 3) + 1;
        return `${year}年 Q${quarter}`;
      }
      case 'year':
        return `${year}年`;
      default:
        return '';
    }
  };

  // 检查日期是否被完成
  const isDateCompleted = (date: Date) => {
    return completedDates.some(completedDate => {
      return completedDate.getFullYear() === date.getFullYear() &&
        completedDate.getMonth() === date.getMonth() &&
        completedDate.getDate() === date.getDate();
    });
  };

  // 渲染周视图
  const renderWeekView = () => {
    const days = [];
    const startDate = new Date(currentDate);
    const day = currentDate.getDay() || 7;
    startDate.setDate(currentDate.getDate() - day + 1);

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }

    return (
      <div className="grid grid-cols-7 gap-1">
        {['一', '二', '三', '四', '五', '六', '日'].map(dayName => (
          <div key={dayName} className="text-center text-xs text-muted-foreground p-1">
            {dayName}
          </div>
        ))}
        
        {days.map((date, i) => {
          const isCompleted = isDateCompleted(date);
          const isToday = date.toDateString() === new Date().toDateString();
          
          return (
            <div 
              key={i} 
              className={cn(
                "aspect-square flex flex-col items-center justify-center rounded-md text-sm",
                isCompleted ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                isToday && !isCompleted && "border border-primary"
              )}
            >
              {date.getDate()}
            </div>
          );
        })}
      </div>
    );
  };

  // 渲染月视图
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // 获取当月的第一天是星期几
    const firstDayOfMonth = new Date(year, month, 1).getDay() || 7; // 将0(周日)转换为7
    
    // 获取当月的天数
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // 创建日历数组
    const calendar = [];
    
    // 添加空白格子
    for (let i = 1; i < firstDayOfMonth; i++) {
      calendar.push(null);
    }
    
    // 添加日期
    for (let i = 1; i <= daysInMonth; i++) {
      calendar.push(new Date(year, month, i));
    }

    return (
      <div className="grid grid-cols-7 gap-1">
        {['一', '二', '三', '四', '五', '六', '日'].map(dayName => (
          <div key={dayName} className="text-center text-xs text-muted-foreground p-1">
            {dayName}
          </div>
        ))}
        
        {calendar.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} className="aspect-square" />;
          
          const isCompleted = isDateCompleted(date);
          const isToday = date.toDateString() === new Date().toDateString();
          
          return (
            <div 
              key={i} 
              className={cn(
                "aspect-square flex flex-col items-center justify-center rounded-md text-sm",
                isCompleted ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                isToday && !isCompleted && "border border-primary"
              )}
            >
              {date.getDate()}
            </div>
          );
        })}
      </div>
    );
  };

  // 渲染季度视图
  const renderQuarterView = () => {
    const year = currentDate.getFullYear();
    const quarter = Math.floor(currentDate.getMonth() / 3);
    const startMonth = quarter * 3;
    
    const months = [];
    for (let i = 0; i < 3; i++) {
      const month = startMonth + i;
      months.push({
        name: new Date(year, month, 1).toLocaleString('default', { month: 'long' }),
        startDate: new Date(year, month, 1),
        daysInMonth: new Date(year, month + 1, 0).getDate()
      });
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {months.map((monthData, monthIndex) => (
          <div key={monthIndex} className="border rounded-md p-2">
            <div className="text-center font-medium mb-2">
              {monthData.name}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {['一', '二', '三', '四', '五', '六', '日'].map(dayName => (
                <div key={dayName} className="text-center text-xs text-muted-foreground">
                  {dayName.charAt(0)}
                </div>
              ))}
              
              {Array.from({ length: monthData.daysInMonth }).map((_, day) => {
                const date = new Date(monthData.startDate);
                date.setDate(day + 1);
                const dayOfWeek = date.getDay() || 7;
                
                // 第一天的位置调整
                if (day === 0) {
                  const offset = dayOfWeek - 1;
                  if (offset > 0) {
                    return (
                      <>
                        {Array.from({ length: offset }).map((_, i) => (
                          <div key={`empty-${i}`} className="aspect-square" />
                        ))}
                        {renderDayCell(date)}
                      </>
                    );
                  }
                }
                
                return renderDayCell(date);
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 渲染年视图
  const renderYearView = () => {
    const year = currentDate.getFullYear();
    const months = [];
    
    for (let i = 0; i < 12; i++) {
      months.push({
        name: new Date(year, i, 1).toLocaleString('default', { month: 'short' }),
        completedDays: countCompletedDaysInMonth(year, i)
      });
    }
    
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {months.map((month, index) => (
          <div 
            key={index} 
            className="border rounded-md p-3 cursor-pointer hover:bg-muted"
            onClick={() => {
              setCurrentDate(new Date(year, index, 1));
              setViewMode('month');
            }}
          >
            <div className="font-medium text-center mb-1">{month.name}</div>
            <div className="text-xs text-center">
              完成 {month.completedDays} 天
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 计算月份中已完成的天数
  const countCompletedDaysInMonth = (year: number, month: number) => {
    return completedDates.filter(date => 
      date.getFullYear() === year && date.getMonth() === month
    ).length;
  };

  // 渲染单个日期格子
  const renderDayCell = (date: Date) => {
    const isCompleted = isDateCompleted(date);
    const isToday = date.toDateString() === new Date().toDateString();
    
    return (
      <div 
        key={date.toISOString()} 
        className={cn(
          "aspect-square flex items-center justify-center text-xs",
          isCompleted ? "bg-primary text-primary-foreground rounded-sm" : "",
          isToday && !isCompleted && "border border-primary rounded-sm"
        )}
      >
        {date.getDate()}
      </div>
    );
  };

  return (
    <Card className={cn("w-full overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-md font-medium">
          {habit.name} 打卡记录
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <CardContent>
        <div className="mb-4 space-y-2">
          <Tabs defaultValue={viewMode} onValueChange={(v) => setViewMode(v as any)}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="week">周</TabsTrigger>
              <TabsTrigger value="month">月</TabsTrigger>
              <TabsTrigger value="quarter">季度</TabsTrigger>
              <TabsTrigger value="year">年</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={goToPrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">{formatDateRange()}</span>
            <Button variant="outline" size="icon" onClick={goToNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="mt-2">
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'month' && renderMonthView()}
            {viewMode === 'quarter' && renderQuarterView()}
            {viewMode === 'year' && renderYearView()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
