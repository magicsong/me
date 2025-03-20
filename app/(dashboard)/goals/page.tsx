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
import { getGoals, getGoalById } from './actions';

function GoalStatusBadge({ status }: { status: GoalStatus }) {
    const statusConfig = {
        'in_progress': {
            label: '进行中',
            variant: 'default',
            icon: <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse mr-1.5" />,
            className: "bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
        },
        'completed': {
            label: '已完成',
            variant: 'success',
            icon: <div className="h-2 w-2 rounded-full bg-green-500 mr-1.5" />,
            className: "bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
        },
        'failed': {
            label: '未达成',
            variant: 'destructive',
            icon: <div className="h-2 w-2 rounded-full bg-red-500 mr-1.5" />,
            className: "bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
        }
    };

    const config = statusConfig[status] || { label: 'Unknown', variant: 'default', icon: null, className: "" };

    return (
        <Badge className={`flex items-center font-medium ${config.className}`}>
            {config.icon}
            {config.label}
        </Badge>
    );
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

async function GoalsList({ filter }: { filter?: GoalStatus | 'all' }) {
    const session = await auth();
    if (!session?.user) return null;

    const goals = await getGoals(session.user.id);

    // Filter goals based on the filter parameter
    const filteredGoals = filter && filter !== 'all'
        ? goals.filter(goal => goal.status === filter)
        : goals;

    if (filteredGoals.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="text-xl font-medium mb-2">
                    {filter && filter !== 'all'
                        ? `没有${
                                {
                                    'in_progress': '进行中',
                                    'completed': '已完成',
                                    'failed': '未达成'
                                }[filter] || ''
                            }的目标`
                        : '还没有创建目标'}
                </h3>
                <p className="text-muted-foreground mb-4">创建一个目标来跟踪你的习惯完成率</p>
                <Link href="/goals/new">
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        创建{filteredGoals.length === 0 && goals.length > 0 ? '新' : '第一个'}目标
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredGoals.map((goal) => (
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
                    <TabsTrigger value="failed">未达成</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-4">
                    <Suspense fallback={<div>加载中...</div>}>
                        <GoalsList />
                    </Suspense>
                </TabsContent>

                <TabsContent value="in_progress" className="mt-4">
                    <Suspense fallback={<div>加载中...</div>}>
                        <GoalsList filter="in_progress" />
                    </Suspense>
                </TabsContent>

                <TabsContent value="completed" className="mt-4">
                    <Suspense fallback={<div>加载中...</div>}>
                        <GoalsList filter="completed" />
                    </Suspense>
                </TabsContent>

                <TabsContent value="failed" className="mt-4">
                    <Suspense fallback={<div>加载中...</div>}>
                        <GoalsList filter="failed" />
                    </Suspense>
                </TabsContent>
            </Tabs>
        </div>
    );
}
