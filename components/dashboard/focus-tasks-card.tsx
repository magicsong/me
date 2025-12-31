"use client";

import { TodoBO } from '@/app/api/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Zap } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface FocusTasksCardProps {
  maxTasks?: number;
}

export function FocusTasksCard({ maxTasks = 3 }: FocusTasksCardProps) {
  const [todos, setTodos] = useState<TodoBO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTodayTasks() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(
          `/api/todo?plannedDate_gte=${today}&status_ne=completed&_sort=-priority`
        );
        const result = await response.json();
        
        if (result.success && Array.isArray(result.data)) {
          // 按优先级排序：urgent > high > medium > low
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          const sorted = result.data
            .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
            .slice(0, maxTasks);
          setTodos(sorted);
        }
      } catch (error) {
        console.error('获取今日任务失败:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchTodayTasks();
  }, [maxTasks]);

  const getPriorityColor = (priority: string) => {
    const colors = {
      urgent: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-blue-100 text-blue-800',
      low: 'bg-gray-100 text-gray-800'
    };
    return colors[priority as keyof typeof colors] || colors.low;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-sm font-medium">重点任务</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground">加载中...</div>
        </CardContent>
      </Card>
    );
  }

  if (todos.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-sm font-medium">重点任务</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">暂无待办任务</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-sm font-medium">重点任务</CardTitle>
          </div>
          <Link 
            href="/daily" 
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            查看全部 <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {todos.map((todo) => (
            <div key={todo.id} className="flex items-start gap-3 p-2 rounded-md hover:bg-white/50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground">{todo.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {todo.description || '无描述'}
                </p>
              </div>
              <Badge className={`text-xs shrink-0 ${getPriorityColor(todo.priority)}`}>
                {todo.priority}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
