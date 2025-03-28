'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Timer, CheckCircle } from 'lucide-react';
import { usePomodoro } from '../contexts/pomodoro-context';

export function PomodoroReminder() {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const pathname = usePathname();
  const { activePomodoro, completePomodoro } = usePomodoro();

  // 格式化时间
  const formatTime = useCallback((ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);
  
  // 计算剩余时间
  useEffect(() => {
    if (!activePomodoro) return;
    
    const startTimeMs = activePomodoro.startTime;
    const endTime = startTimeMs + (activePomodoro.duration * 60 * 1000);
    
    const updateTimeLeft = () => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      setTimeLeft(remaining);
    };
    
    // 立即更新一次
    updateTimeLeft();
    
    // 设置更新间隔
    const intervalId = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(intervalId);
  }, [activePomodoro]);
  
  // 如果在番茄钟页面、没有活动的番茄钟或正在加载，不显示提醒
  if (pathname === '/pomodoro' || (!activePomodoro && !isLoading)) {
    return null;
  }

  // 显示加载状态
  if (isLoading && !activePomodoro) {
    return (
      <Card className="fixed bottom-4 right-4 p-4 flex items-center gap-3 bg-card shadow-md z-50 max-w-xs">
        <div className="flex items-center gap-2 text-orange-500">
          <Timer size={20} className="animate-pulse" />
          <span className="font-medium">加载中...</span>
        </div>
      </Card>
    );
  }
  
  return (
    <Card className="fixed bottom-4 right-4 p-4 flex items-center gap-3 bg-card shadow-md z-50 max-w-xs">
      <div className="flex items-center gap-2 text-orange-500">
        <Timer size={20} />
        <span className="font-medium">{formatTime(timeLeft)}</span>
      </div>
      
      <Button 
        size="sm" 
        variant="outline" 
        className="flex gap-1 items-center"
        onClick={completePomodoro}
        disabled={timeLeft > 0} // 时间未结束时禁用按钮
        title={timeLeft > 0 ? "请等待番茄钟计时结束" : "完成番茄钟"}
      >
        <CheckCircle size={16} />
        完成
      </Button>
    </Card>
  );
}
