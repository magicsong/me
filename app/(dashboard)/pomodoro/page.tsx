'use client';

import { useEffect } from 'react';
import { PomodoroTimer } from './components/pomodoro-timer';
import { PomodoroList } from './components/pomodoro-list';
import { PomodoroTagManager } from './components/pomodoro-tag-manager';
import { PomodoroStats } from './components/pomodoro-stats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePomodoro } from '../../contexts/pomodoro-context';

export default function PomodoroPage() {
  const { activePomodoro, setActivePomodoro } = usePomodoro();

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* 统计信息放在顶部 */}
      <header className="p-4 border-b">
        
      </header>

      {/* 主体内容改为两列布局 */}
      <main className="flex flex-1 p-4 gap-4 overflow-hidden">
        {/* 左侧：番茄钟和标签管理 */}
        <div className="w-1/2 flex flex-col gap-4 overflow-y-auto">
          <Card className="flex-shrink-0">
            <CardHeader className="py-3">
              <CardTitle>番茄钟</CardTitle>
            </CardHeader>
            <CardContent>
              <PomodoroTimer 
                activePomodoro={activePomodoro} 
                playSoundOnComplete={true} 
                onPomodoroChange={setActivePomodoro} 
              />
            </CardContent>
          </Card>
        </div>
        
        {/* 右侧：历史记录，添加滚动能力 */}
        <div className="w-1/2 flex flex-col gap-4 overflow-y-auto">
          <Card className="flex-shrink-0">
            <CardHeader className="py-3">
              <CardTitle>统计数据</CardTitle>
            </CardHeader>
            <CardContent>
              <PomodoroStats />
            </CardContent>
          </Card>
          
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="py-3">
              <CardTitle>历史记录</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              <PomodoroList />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}