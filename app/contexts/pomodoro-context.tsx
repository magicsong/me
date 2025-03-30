'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { da } from 'date-fns/locale';

interface Pomodoro {
  id: string;
  startTime: number;
  duration: number;
  tag?: string;
  completed?: boolean;
  title: string;
  endTime: number;
  description: string;
}

interface PomodoroContextType {
  activePomodoro: Pomodoro | null;
  setActivePomodoro: (pomodoro: Pomodoro | null) => void;
  completePomodoro: () => Promise<void>;
  isLoading: boolean;
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

// 缓存键和过期时间常量
const CACHE_KEY = 'activePomodoro';
const CACHE_EXPIRES_IN_MS = 5 * 60 * 1000; // 5分钟

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const [activePomodoro, setActivePomodoro] = useState<Pomodoro | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const pathname = usePathname();
  
  // 从缓存获取数据
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

  // 保存到缓存
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

  // 清除缓存
  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (e) {
      console.error('清除缓存失败:', e);
    }
  }, []);
  
  // 获取番茄钟数据
  const fetchActivePomodoro = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/pomodoro?status=running&limit=1', { 
        headers: { 'Cache-Control': 'no-cache' } 
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const pomodoro = {
            id: data[0].pomodoro.id,
            startTime: new Date(data[0].pomodoro.start_time).getTime(),
            duration: data[0].pomodoro.duration,
            tag: data[0].pomodoro.tag,
            endTime: new Date(data[0].pomodoro.end_time).getTime(),
            title: data[0].pomodoro.title
          };
          saveToCache(pomodoro);
          setActivePomodoro(pomodoro);
        } else {
          clearCache();
          setActivePomodoro(null);
        }
      }
    } catch (error) {
      console.error('获取活动番茄钟失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, [saveToCache, clearCache]);
  
  // 初始加载和定期更新数据
  useEffect(() => {
    // 立即尝试从缓存加载
    const cachedPomodoro = getFromCache();
    if (cachedPomodoro) {
      setActivePomodoro(cachedPomodoro);
      setIsLoading(false);
    }

    // 从服务端获取最新数据
    fetchActivePomodoro();
    
    // 定期检查是否有新的活动番茄钟
    const intervalId = setInterval(fetchActivePomodoro, 60000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [getFromCache, fetchActivePomodoro]);
  
  // 完成番茄钟的函数
  const completePomodoro = useCallback(async () => {
    if (!activePomodoro) return;
    
    try {
      const response = await fetch(`/api/pomodoro/${activePomodoro.id}/complete`, {
        method: 'POST',
      });
      
      if (response.ok) {
        clearCache();
        setActivePomodoro(null);
      } else {
        throw new Error('请求失败');
      }
    } catch (error) {
      console.error('完成番茄钟失败:', error);
    }
  }, [activePomodoro, clearCache]);
  
  return (
    <PomodoroContext.Provider 
      value={{ 
        activePomodoro, 
        setActivePomodoro,
        completePomodoro,
        isLoading
      }}
    >
      {children}
    </PomodoroContext.Provider>
  );
}

export function usePomodoro() {
  const context = useContext(PomodoroContext);
  if (context === undefined) {
    throw new Error('usePomodoro must be used within a PomodoroProvider');
  }
  return context;
}
