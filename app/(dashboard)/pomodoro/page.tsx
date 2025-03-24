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
      <header className="flex justify-between items-center p-4">
        <h1 className="text-xl">番茄钟</h1>
      </header>
      <main className="flex flex-1 overflow-hidden">
        <section className="flex-1 flex flex-col items-center justify-center bg-cover bg-center" style={{ backgroundImage: 'url(/path/to/background.jpg)' }}>
          <Card className="w-full max-w-md">
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
        </section>
        <aside className="w-96 overflow-y-auto">
          <Card className="m-4">
            <CardHeader>
              <CardTitle>统计</CardTitle>
            </CardHeader>
            <CardContent>
              <PomodoroStats />
            </CardContent>
          </Card>
          <Card className="m-4">
            <CardHeader>
              <CardTitle>历史记录</CardTitle>
            </CardHeader>
            <CardContent>
              <PomodoroList />
            </CardContent>
          </Card>
          <Card className="m-4">
            <CardHeader>
              <CardTitle>标签管理</CardTitle>
            </CardHeader>
            <CardContent>
              <PomodoroTagManager />
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
}
