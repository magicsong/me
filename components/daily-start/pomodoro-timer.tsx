import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  PlayIcon, 
  PauseIcon, 
  RefreshCwIcon, 
  SkipForwardIcon 
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";

interface PomodoroTimerProps {
  isOpen: boolean;
  onClose: () => void;
  todoId: number;
  todoTitle: string;
  onComplete?: () => void;
}

// 默认时间设置（单位：分钟）
const DEFAULT_WORK_TIME = 25;
const DEFAULT_BREAK_TIME = 5;

export function PomodoroTimer({
  isOpen,
  onClose,
  todoId,
  todoTitle,
  onComplete
}: PomodoroTimerProps) {
  // 状态
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [workDuration, setWorkDuration] = useState(DEFAULT_WORK_TIME);
  const [breakDuration, setBreakDuration] = useState(DEFAULT_BREAK_TIME);
  const [timeLeft, setTimeLeft] = useState(workDuration * 60);
  const [progress, setProgress] = useState(100);

  // 重置计时器
  const resetTimer = useCallback(() => {
    const duration = mode === 'work' ? workDuration : breakDuration;
    setTimeLeft(duration * 60);
    setProgress(100);
    setIsRunning(false);
  }, [mode, workDuration, breakDuration]);

  // 切换工作/休息模式
  const toggleMode = useCallback(() => {
    const newMode = mode === 'work' ? 'break' : 'work';
    setMode(newMode);
    setTimeLeft((newMode === 'work' ? workDuration : breakDuration) * 60);
    setProgress(100);
    setIsRunning(true);
  }, [mode, workDuration, breakDuration]);

  // 处理计时逻辑
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          const newTimeLeft = prev - 1;
          const totalTime = mode === 'work' ? workDuration * 60 : breakDuration * 60;
          setProgress(Math.max(0, (newTimeLeft / totalTime) * 100));
          return newTimeLeft;
        });
      }, 1000);
    } else if (isRunning && timeLeft === 0) {
      // 当前阶段完成
      if (mode === 'work') {
        // 工作阶段完成，如果提供了完成回调，调用它
        if (onComplete) onComplete();
      }
      
      // 播放声音提醒
      const audio = new Audio('/sounds/bell.mp3');
      audio.play().catch(e => console.log('播放声音失败:', e));
      
      // 切换到下一个模式
      toggleMode();
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, mode, toggleMode, workDuration, breakDuration, onComplete]);

  // 格式化时间为 MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {
      if (isRunning) {
        if (confirm('番茄钟正在运行，确定要退出吗？')) {
          onClose();
        }
      } else {
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'work' ? '工作时间' : '休息时间'} - {todoTitle}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="text-5xl font-bold">
              {formatTime(timeLeft)}
            </div>
            
            <Progress value={progress} className="h-2 w-full" />
            
            <div className="flex items-center gap-2 mt-4">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setIsRunning(!isRunning)}
              >
                {isRunning ? <PauseIcon /> : <PlayIcon />}
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                onClick={resetTimer}
              >
                <RefreshCwIcon />
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                onClick={toggleMode}
              >
                <SkipForwardIcon />
              </Button>
            </div>
          </div>
          
          <div className="space-y-4 mt-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                工作时间: {workDuration} 分钟
              </label>
              <Slider 
                value={[workDuration]} 
                min={5} 
                max={60} 
                step={5}
                onValueChange={([value]) => {
                  setWorkDuration(value);
                  if (mode === 'work') resetTimer();
                }}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                休息时间: {breakDuration} 分钟
              </label>
              <Slider 
                value={[breakDuration]} 
                min={1} 
                max={30} 
                step={1}
                onValueChange={([value]) => {
                  setBreakDuration(value);
                  if (mode === 'break') resetTimer();
                }}
              />
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            隐藏
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
