'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/hooks/use-toast';
import { PomodoroBO } from '@/app/api/types';

// 简化状态类型，只保留当前和已完成
type PomodoroStatus = 'current' | 'completed';

export function PomodoroList() {
  const [pomodoros, setPomodoros] = useState<PomodoroBO[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const { toast } = useToast();
  const PAGE_SIZE = 10;

  useEffect(() => {
    loadPomodoros(true);
  }, []);

  const loadPomodoros = async (reset = false) => {
    if (reset) {
      setPage(0);
      setPomodoros([]);
    }
    
    try {
      setLoading(true);
      const currentPage = reset ? 0 : page;
      const offset = currentPage * PAGE_SIZE;
      
      const url = `/api/pomodoro?limit=${PAGE_SIZE}&offset=${offset}`;
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        
        if (reset) {
          setPomodoros(data.data);
        } else {
          setPomodoros(prev => [...prev, ...data]);
        }
        
        setHasMore(data.data.length === PAGE_SIZE);
        setPage(currentPage + 1);
      }
    } catch (error) {
      console.error('加载番茄钟失败:', error);
      toast({
        title: "加载失败",
        description: "无法获取番茄钟历史记录",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    // 简化状态标签，只保留当前和已完成
    switch (status) {
      case 'running':
      case 'paused':
        return <Badge className="bg-blue-500">当前</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">已完成</Badge>;
      default:
        return <Badge>未知</Badge>;
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'yyyy年MM月dd日 HH:mm', { locale: zhCN });
    } catch (e) {
      return dateStr;
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      loadPomodoros();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">番茄钟历史</h3>
      </div>

      <div className="space-y-4">
        {pomodoros.length === 0 && !loading ? (
          <div className="text-center py-10 text-muted-foreground">
            没有找到番茄钟记录
          </div>
        ) : (
          pomodoros.map((pomodoro) => (
            <Card key={pomodoro.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{pomodoro.title}</CardTitle>
                  {getStatusBadge(pomodoro.status)}
                </div>
                <CardDescription>
                  {formatDateTime(pomodoro.createdAt)}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                {pomodoro.description && (
                  <p className="text-sm text-muted-foreground mb-2">{pomodoro.description}</p>
                )}
                <div className="flex justify-between text-sm">
                  <span>时长: {pomodoro.duration} 分钟</span>
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <div className="w-full flex justify-end">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      // 功能预留: 查看详情或重复此番茄钟
                    }}
                  >
                    查看详情
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))
        )}

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="h-4 w-1/4 mt-1" />
                </CardHeader>
                <CardContent className="pb-2">
                  <Skeleton className="h-4 w-full" />
                  <div className="flex justify-between mt-2">
                    <Skeleton className="h-3 w-1/4" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  <div className="w-full flex justify-end">
                    <Skeleton className="h-7 w-20" />
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {!loading && hasMore && (
          <div className="flex justify-center pb-4">
            <Button variant="outline" onClick={loadMore}>
              加载更多
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}