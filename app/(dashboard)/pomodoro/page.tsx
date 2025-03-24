'use client';

import { useState } from 'react';
import { PomodoroTimer } from './components/pomodoro-timer';
import { PomodoroList } from './components/pomodoro-list';
import { PomodoroTagManager } from './components/pomodoro-tag-manager';
import { PomodoroStats } from './components/pomodoro-stats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PomodoroPage() {
  const [activePomodoro, setActivePomodoro] = useState(null);

  return (
    <div className="flex flex-col h-screen">
      {/* 统计信息放在顶部 */}
      <header className="p-4 border-b">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-2">
              <h1 className="text-xl font-bold">番茄钟</h1>
            </div>
            <PomodoroStats />
          </CardContent>
        </Card>
      </header>

      {/* 主体内容改为两列布局 */}
      <main className="flex flex-1 overflow-hidden p-4 gap-4">
        {/* 左侧：番茄钟和标签管理 */}
        <div className="w-1/2 flex flex-col gap-4">
          <Card className="flex-shrink-0">
            <CardHeader>
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
          
          <Card className="flex-shrink-0">
            <CardHeader>
              <CardTitle>标签管理</CardTitle>
            </CardHeader>
            <CardContent>
              <PomodoroTagManager />
            </CardContent>
          </Card>
        </div>
        
        {/* 右侧：历史记录，添加滚动能力 */}
        <div className="w-1/2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>历史记录</CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-4rem)] overflow-y-auto">
              <PomodoroList />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
