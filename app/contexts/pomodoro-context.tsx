'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';

interface Pomodoro {
  id: string;
  startTime: number;
  duration: number;
  tag?: string;
  completed?: boolean;
}

interface PomodoroContextType {
  activePomodoro: Pomodoro | null;
  setActivePomodoro: (pomodoro: Pomodoro | null) => void;
  completePomodoro: () => void;
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const [activePomodoro, setActivePomodoro] = useState<Pomodoro | null>(null);
  const pathname = usePathname();
  
  // 从 localStorage 加载活动的番茄钟
  useEffect(() => {
    const storedPomodoro = localStorage.getItem('activePomodoro');
    if (storedPomodoro) {
      const parsedPomodoro = JSON.parse(storedPomodoro);
      setActivePomodoro(parsedPomodoro);
    }
  }, []);
  
  // 当 activePomodoro 改变时，保存到 localStorage
  useEffect(() => {
    if (activePomodoro) {
      localStorage.setItem('activePomodoro', JSON.stringify(activePomodoro));
    } else {
      localStorage.removeItem('activePomodoro');
    }
  }, [activePomodoro]);
  
  // 完成番茄钟的函数
  const completePomodoro = () => {
    if (activePomodoro) {
      // 可以在这里添加将完成的番茄钟保存到历史记录的逻辑
      const completedPomodoro = {...activePomodoro, completed: true};
      // TODO: 保存到历史记录
      setActivePomodoro(null);
    }
  };
  
  return (
    <PomodoroContext.Provider 
      value={{ 
        activePomodoro, 
        setActivePomodoro,
        completePomodoro 
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
