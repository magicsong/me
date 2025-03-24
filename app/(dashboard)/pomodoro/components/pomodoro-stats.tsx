'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';

type Stats = {
  total: number;
  completed: number;
  canceled: number;
  active: number;
  totalMinutes: number;
};

export function PomodoroStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('today');
  
  useEffect(() => {
    loadStats();
  }, [period]);
  
  const loadStats = async () => {
    setLoading(true);
    try {
      let url = '/api/pomodoro/stats';
      if (period !== 'all') {
        url += `?period=${period}`;
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('加载番茄钟统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}小时${mins > 0 ? `${mins}分钟` : ''}`;
    }
    return `${mins}分钟`;
  };
  
  const pieData = stats ? [
    { name: '已完成', value: stats.completed, color: '#10b981' },
    { name: '已取消', value: stats.canceled, color: '#ef4444' },
    { name: '进行中', value: stats.active, color: '#3b82f6' }
  ].filter(item => item.value > 0) : [];
  
  const barData = [
    { name: '今日', 完成: 0, 取消: 0 },
    { name: '本周', 完成: 0, 取消: 0 },
    { name: '本月', 完成: 0, 取消: 0 }
  ];
  
  return (
    <div className="space-y-4">
      <Tabs defaultValue="today" value={period} onValueChange={setPeriod} className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="today">今日</TabsTrigger>
          <TabsTrigger value="week">本周</TabsTrigger>
          <TabsTrigger value="month">本月</TabsTrigger>
          <TabsTrigger value="all">全部</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-[100px] w-full" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      ) : (
        <>
          {stats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4 flex flex-col items-center justify-center">
                    <span className="text-sm text-muted-foreground">总时长</span>
                    <h3 className="text-2xl font-bold mt-1">
                      {formatTime(stats.totalMinutes)}
                    </h3>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex flex-col items-center justify-center">
                    <span className="text-sm text-muted-foreground">成功率</span>
                    <h3 className="text-2xl font-bold mt-1">
                      {stats.total > 0 
                        ? `${Math.round((stats.completed / stats.total) * 100)}%` 
                        : '0%'}
                    </h3>
                  </CardContent>
                </Card>
              </div>
              
              {stats.total > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h4 className="text-sm font-medium mb-4 text-center">番茄钟状态分布</h4>
                    <div className="h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}