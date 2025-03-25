import { CalendarCheck2, LineChart } from 'lucide-react';
import { HabitCheckInCard } from './habit-check-in-card';
import { getHabits, getHabitStats } from '../habits/actions';
import { UserProfileCard } from '@/components/user-profile-card';
import { auth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DailyQuote } from '@/components/DailyQuote'; 
import { DailySummaryViewer } from './daily-summary-viewer'; // 导入总结查看器组件

export default async function DashboardPage() {
  // 获取用户会话
  const session = await auth();
  const user = session?.user;
  
  // 获取习惯数据
  const habits = await getHabits();
  const completedHabits = habits.filter(habit => habit.completedToday).length;
  const totalHabits = habits.length;
  
  // 获取习惯统计信息
  const habitStats = await getHabitStats('week');
  
  return (
    <>
      {/* 用户信息展示 */}
      {user && (
        <UserProfileCard 
          name={user.name || "习惯养成者"}
          email={user.email || ""}
          image={user.image}
        />
      )}
      
      {/* 每日推荐语录 */}
      <div className="mb-6">
        <DailyQuote />
      </div>
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarCheck2 className="h-6 w-6" />
          <h1 className="text-xl font-semibold">今日概览</h1>
        </div>
      </div>
      
      {/* 习惯完成概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">习惯总数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHabits}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalHabits > 0 
                ? "继续保持良好习惯" 
                : "添加一些习惯开始追踪"}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">今日已完成</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedHabits}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalHabits > 0 
                ? `完成率 ${Math.round((completedHabits / totalHabits) * 100)}%` 
                : "尚未完成任何习惯"}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">本周完成率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(habitStats.overallCompletionRate * 100)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {habitStats.periodLabel}
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* 添加日常总结查看器 */}
      <DailySummaryViewer />
      
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
