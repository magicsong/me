import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarCheck2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { HabitsList } from './habits-list';
import { getHabits } from './actions';
import { AddHabitButton } from './add-habit-button';

export default async function HabitsPage() {
  const habits = await getHabits();

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarCheck2 className="h-6 w-6" />
          <h1 className="text-xl font-semibold">习惯养成</h1>
        </div>
        <AddHabitButton />
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>我的习惯</CardTitle>
          <CardDescription>
            管理你正在培养的习惯。点击完成按钮记录每日进度。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HabitsList habits={habits} />
        </CardContent>
      </Card>
    </>
  );
}
