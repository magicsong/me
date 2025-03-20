import { Suspense } from 'react';
import Link from 'next/link';
import { PlusCircle, Calendar, BarChart, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { auth } from '@/lib/auth';
import { formatDate } from '@/lib/utils';
import { GoalType, GoalStatus } from '@/lib/types';
import { getGoals,getGoalById } from './actions';

function GoalStatusBadge({ status }: { status: GoalStatus }) {
  const statusMap = {
    'in_progress': { label: '进行中', variant: 'default' },
    'completed': { label: '已完成', variant: 'success' },
    'failed': { label: '未达成', variant: 'destructive' }
  };
  
  const { label, variant } = statusMap[status] || { label: 'Unknown', variant: 'default' };
  
  return <Badge variant={variant as any}>{label}</Badge>;
}

function GoalTypeBadge({ type }: { type: GoalType }) {
  const typeMap = {
    'annual': '年度目标',
    'quarterly': '季度目标',
    'monthly': '月度目标',
    'custom': '自定义'
  };
  
  return <Badge variant="outline">{typeMap[type]}</Badge>;
}

async function GoalsList() {
  const session = await auth();
  if (!session?.user) return null;
  
  const goals = await getGoals(session.user.id);
  
  if (goals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="text-4xl mb-4">🎯</div>
        <h3 className="text-xl font-medium mb-2">还没有创建目标</h3>
        <p className="text-muted-foreground mb-4">创建一个目标来跟踪你的习惯完成率</p>
        <Link href="/goals/new">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            创建第一个目标
          </Button>
        </Link>
      </div>
    );
  }
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {goals.map((goal) => (
        <Link href={`/goals/${goal.id}`} key={goal.id}>
          <Card className="h-full cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GoalTypeBadge type={goal.type} />
                  <GoalStatusBadge status={goal.status} />
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-xl mt-2">{goal.title}</CardTitle>
              <CardDescription className="line-clamp-2">{goal.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-muted-foreground mb-3">
                <Calendar className="h-4 w-4 mr-2" />
                <span>{formatDate(goal.startDate)} - {formatDate(goal.endDate)}</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>习惯目标:</span>
                  <span>{goal.habitTargets?.length || 0}个</span>
                </div>
                
                {/* 显示进度条 */}
                <div className="w-full bg-gray-100 rounded-full h-2.5 dark:bg-gray-700">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${Math.round(goal.progress || 0)}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">总体进度</span>
                  <span className="font-medium">{Math.round(goal.progress || 0)}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export default function GoalsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">目标管理</h1>
        <Link href="/goals/new">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            创建目标
          </Button>
        </Link>
      </div>
      
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">全部目标</TabsTrigger>
          <TabsTrigger value="in_progress">进行中</TabsTrigger>
          <TabsTrigger value="completed">已完成</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
          <Suspense fallback={<div>加载中...</div>}>
            <GoalsList />
          </Suspense>
        </TabsContent>
        
        {/* 其他标签页内容类似 */}
      </Tabs>
    </div>
  );
}
