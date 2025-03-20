import { CalendarCheck2 } from 'lucide-react';
import { HabitCheckInCard } from './habit-check-in-card';
import { getHabits } from '../habits/actions';

export default async function DashboardPage() {
  const habits = await getHabits();
  const completedHabits = habits.filter(habit => habit.completedToday).length;
  const totalHabits = habits.length;
  
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarCheck2 className="h-6 w-6" />
          <h1 className="text-xl font-semibold">今日概览</h1>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-3">
          <HabitCheckInCard 
            habits={habits} 
            completedCount={completedHabits} 
            totalCount={totalHabits} 
          />
        </div>
      </div>
    </>
  );
}
