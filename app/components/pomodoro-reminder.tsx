'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Timer, CheckCircle } from 'lucide-react';

// 定义番茄钟类型
interface Pomodoro {
  id: string;
  title: string;
  start_time: string; // UTC 字符串
  duration: number;
  // 其他必要属性
}

// 缓存键和过期时间常量
const CACHE_KEY = 'active_pomodoro';
const CACHE_EXPIRES_IN_MS = 5 * 60 * 1000; // 5分钟

export function PomodoroReminder() {
  const [activePomodoro, setActivePomodoro] = useState<Pomodoro | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const pathname = usePathname();

  // 从缓存获取数据 - 优化为独立的回调函数
  const getFromCache = useCallback(() => {
    try {
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (!cachedData) return null;
      
      const parsed = JSON.parse(cachedData);
      
      // 检查是否过期
      if (Date.now() > parsed.expiresAt) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      
      return parsed.data;
    } catch (e) {
      console.error('读取缓存失败:', e);
      return null;
    }
  }, []);

  // 保存到缓存 - 优化为独立的回调函数
  const saveToCache = useCallback((data: Pomodoro) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + CACHE_EXPIRES_IN_MS
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (e) {
      console.error('缓存番茄钟失败:', e);
    }
  }, []);

  // 清除缓存 - 优化为独立的回调函数
  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (e) {
      console.error('清除缓存失败:', e);
    }
  }, []);

  // 完成番茄钟
  const completePomodoro = useCallback(async () => {
    if (!activePomodoro) return;
    
    try {
      const response = await fetch(`/api/pomodoro/${activePomodoro.id}/complete`, {
        method: 'POST',
      });
      
      if (response.ok) {
        setActivePomodoro(null);
        clearCache();
      }
    } catch (error) {
      console.error('完成番茄钟失败:', error);
    }
  }, [activePomodoro, clearCache]);

  // 格式化时间
  const formatTime = useCallback((ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // 优化获取番茄钟逻辑：首先加载缓存，然后异步加载服务器数据
  useEffect(() => {
    // 立即尝试从缓存加载
    const cachedPomodoro = getFromCache();
    if (cachedPomodoro) {
      setActivePomodoro(cachedPomodoro);
      setIsLoading(false);
    }

    // 创建控制器用于请求取消
    const controller = new AbortController();
    const { signal } = controller;

    async function fetchActivePomodoro() {
      if (signal.aborted) return;
      
      try {
        // 设置请求超时
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch('/api/pomodoro?status=running&limit=1', { 
          signal,
          headers: { 'Cache-Control': 'no-cache' } 
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            const pomodoro = data[0].pomodoro;
            saveToCache(pomodoro);
            setActivePomodoro(pomodoro);
          } else {
            clearCache();
            setActivePomodoro(null);
          }
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('获取活动番茄钟失败:', error);
        }
      } finally {
        setIsLoading(false);
      }
    }
    
    // 只有当缓存中没有数据时才立即请求
    if (!cachedPomodoro) {
      fetchActivePomodoro();
    } else {
      // 如果有缓存，在后台更新数据
      setTimeout(fetchActivePomodoro, 100);
    }
    
    // 定期检查是否有新的活动番茄钟
    const intervalId = setInterval(fetchActivePomodoro, 30000);
    
    return () => {
      controller.abort(); // 取消进行中的请求
      clearInterval(intervalId);
    };
  }, [getFromCache, saveToCache, clearCache]);
  
  // 优化计算剩余时间的逻辑
  useEffect(() => {
    if (!activePomodoro) return;
    
    // 优化日期处理 - 确保即使日期格式有问题也能尽可能解析
    const parseStartTime = (dateStr: string) => {
      try {
        // 尝试多种方式解析日期
        let date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          // 尝试替换空格为T
          date = new Date(dateStr.replace(' ', 'T'));
        }
        if (isNaN(date.getTime())) {
          // 尝试添加Z表示UTC
          date = new Date(dateStr.replace(' ', 'T') + 'Z');
        }
        return date.getTime();
      } catch (e) {
        console.error('解析日期失败:', e);
        return Date.now(); // 防止完全失败时返回当前时间
      }
    };

    const startTimeMs = parseStartTime(activePomodoro.start_time);
    const endTime = startTimeMs + (activePomodoro.duration * 60 * 1000);
    
    // 优化定时器逻辑，防止不必要的更新
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
