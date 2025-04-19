"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { CalendarCheck2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AddHabitButton } from './add-habit-button';
import { getHabits } from './client-actions';
import { HabitStats } from './habit-stats';
import { HabitsList } from './habits-list';
import { RewardsStats } from './rewards-stats';

export default function HabitsPage() {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHabits = async () => {
      try {
        const data = await getHabits();
        setHabits(data);
      } catch (error) {
        console.error("获取习惯数据失败:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHabits();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center p-8">加载中...</div>;
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarCheck2 className="h-6 w-6" />
          <h1 className="text-xl font-semibold">习惯养成</h1>
        </div>
        <AddHabitButton />
      </div>
      
      <div className="grid gap-4 md:grid-cols-12">
        <div className="md:col-span-9">
          <Card>
            <CardHeader>
              <CardTitle>我的习惯</CardTitle>
              <CardDescription>
                管理你正在培养的习惯。点击完成按钮记录每日进度，获得奖励点数。
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HabitsList habits={habits} />
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-3 space-y-4">
          <RewardsStats />
          <HabitStats />
        </div>
      </div>
    </>
  );
}
