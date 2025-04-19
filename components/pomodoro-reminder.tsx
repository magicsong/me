'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Timer, CheckCircle, ArrowRight } from 'lucide-react';
import { usePomodoro } from '../app/contexts/pomodoro-context';

export function PomodoroReminder() {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const pathname = usePathname();
  const { activePomodoro, completePomodoro } = usePomodoro();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevTimeLeftRef = useRef<number>(0); // 添加一个引用来存储上一次的 timeLeft 值

  // 格式化时间
  const formatTime = useCallback((ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);
  // 初始化音频
  useEffect(() => {
    try {
      audioRef.current = new Audio('/sounds/complete.mp3');
      // 预加载音频
      audioRef.current.load();
    } catch (error) {
      console.error('初始化音频失败:', error);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);
  // 计算剩余时间
  useEffect(() => {
    if (!activePomodoro) return;
    const startTimeMs = activePomodoro.startTime;
    const endTime = startTimeMs + (activePomodoro.duration * 60 * 1000);

    const updateTimeLeft = () => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      if (remaining > 0) {
        setIsLoading(false); // 当有剩余时间时，设置加载状态为 false
      }
      setTimeLeft(remaining);
    };

    // 立即更新一次
    updateTimeLeft();

    // 设置更新间隔
    const intervalId = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(intervalId);
  }, [activePomodoro]);

  // 播放完成音频
  useEffect(() => {
    // 当时间为0且有活动的番茄钟时播放音频，并确保只播放一次
    if (prevTimeLeftRef.current > 0 && timeLeft === 0 && activePomodoro && audioRef.current) {
      audioRef.current.currentTime = 0; // 重置音频到开始位置
      audioRef.current.play().catch(error => {
        console.error('播放音频失败:', error);
      });
    }
    prevTimeLeftRef.current = timeLeft;
  }, [timeLeft, activePomodoro]);

  // 如果在番茄钟页面、没有活动的番茄钟或正在加载，不显示提醒
  if (pathname === '/pomodoro' || (!activePomodoro && !isLoading)) {
    return null;
  }

  // 显示加载状态
  if (isLoading && !activePomodoro) {
    return (
      <Card className="fixed bottom-4 right-4 p-4 flex items-center justify-between gap-3 bg-card shadow-md z-50 max-w-xs">
        <div className="flex items-center gap-2 text-orange-500">
          <Timer size={20} className="animate-pulse" />
          <span className="font-medium">加载任务中...</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="ml-2 flex items-center gap-1"
          onClick={() => useRouter().push('/pomodoro')}
          title="前往番茄钟页面"
        >
          查看<ArrowRight size={14} />
        </Button>
      </Card>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 p-4 bg-card shadow-md z-50 max-w-xs">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2 text-orange-500">
          <Timer size={20} />
          <span className="font-medium">{formatTime(timeLeft)}</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto flex items-center gap-1"
          onClick={() => useRouter().push('/pomodoro')}
          title="前往番茄钟页面"
        >
          查看<ArrowRight size={14} />
        </Button>
      </div>

      {activePomodoro?.title && (
        <div className="text-sm text-muted-foreground mb-2">
          {activePomodoro.title}
        </div>
      )}

      <Button
        size="sm"
        variant="outline"
        className="flex gap-1 items-center w-full"
        onClick={completePomodoro}
        disabled={timeLeft > 0}
        title={timeLeft > 0 ? "请等待番茄钟计时结束" : "完成番茄钟"}
      >
        <CheckCircle size={16} />
        完成
      </Button>
    </Card>
  );
}
