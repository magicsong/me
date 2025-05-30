'use client';

import { useState, useEffect, useMemo } from 'react';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/hooks/use-toast';
import { PomodoroBO } from '@/app/api/types';
import { Clock, CheckCircle2 } from 'lucide-react';

// 按日期分组的数据接口
interface PomodoroByDate {
  date: string;
  dateLabel: string;
  pomodoros: PomodoroBO[];
}

export function PomodoroTimeline() {
  const [pomodoros, setPomodoros] = useState<PomodoroBO[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const { toast } = useToast();
  const PAGE_SIZE = 15;

  // 按日期分组的番茄钟数据
  const pomodorosByDate = useMemo(() => {
    const grouped: PomodoroByDate[] = [];
    const dateMap = new Map<string, PomodoroBO[]>();

    // 按日期分组
    pomodoros.forEach(pomodoro => {
      const date = new Date(pomodoro.createdAt);
      const dateString = format(date, 'yyyy-MM-dd');
      
      if (!dateMap.has(dateString)) {
        dateMap.set(dateString, []);
      }
      
      dateMap.get(dateString)!.push(pomodoro);
    });

    // 转换为数组格式
    dateMap.forEach((items, dateStr) => {
      const date = new Date(dateStr);
      let dateLabel = format(date, 'yyyy年MM月dd日', { locale: zhCN });
      
      // 对于今天和昨天使用更友好的标签
      if (isToday(date)) {
        dateLabel = '今天';
      } else if (isYesterday(date)) {
        dateLabel = '昨天';
      }
      
      grouped.push({
        date: dateStr,
        dateLabel,
        pomodoros: items
      });
    });

    // 按日期降序排序
    return grouped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [pomodoros]);

  // 计算单个日期内的总专注时长
  const getTotalDuration = (pomodoros: PomodoroBO[]) => {
    return pomodoros.reduce((total, item) => {
      return total + (item.duration || 0);
    }, 0);
  };

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
          setPomodoros(prev => [...prev, ...data.data]);
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

  const formatTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'HH:mm', { locale: zhCN });
    } catch (e) {
      return '';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
      case 'paused':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      loadPomodoros();
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">专注时间线</h3>
      </div>

      {pomodoros.length === 0 && !loading ? (
        <div className="text-center py-10 text-muted-foreground">
          没有找到番茄钟记录
        </div>
      ) : (
        <div className="relative">
          {/* 中心线 */}
          <div className="absolute left-6 top-8 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
          
          {pomodorosByDate.map((group) => (
            <div key={group.date} className="mb-8">
              {/* 日期标题 */}
              <div className="flex items-center mb-4">
                <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-primary text-white font-semibold">
                  {group.dateLabel.length <= 2 ? group.dateLabel : format(new Date(group.date), 'd日')}
                </div>
                <div className="ml-4">
                  <h4 className="font-medium">{group.dateLabel}</h4>
                  <p className="text-sm text-muted-foreground">
                    总计专注 {getTotalDuration(group.pomodoros)} 分钟
                  </p>
                </div>
              </div>
              
              {/* 番茄时间线列表 */}
              <div className="space-y-4 ml-6 pl-10 relative">
                {group.pomodoros.map((pomodoro) => (
                  <div 
                    key={pomodoro.id} 
                    className="p-4 bg-card rounded-lg border shadow-sm hover:shadow-md transition-shadow relative"
                  >
                    {/* 左侧圆点 */}
                    <div className="absolute left-[-33px] top-5 w-6 h-6 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                      {getStatusIcon(pomodoro.status)}
                    </div>
                    
                    {/* 内容区域 */}
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h5 className="font-medium">{pomodoro.title}</h5>
                          <p className="text-sm text-muted-foreground">{formatTime(pomodoro.createdAt)}</p>
                        </div>
                        <Badge className={pomodoro.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}>
                          {pomodoro.duration}分钟
                        </Badge>
                      </div>
                      {pomodoro.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{pomodoro.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="space-y-4 ml-6 pl-10 relative">
          <div className="absolute left-[-6px] top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 bg-card rounded-lg border relative">
              <div className="absolute left-[-20px] top-5 w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && hasMore && (
        <div className="flex justify-center mt-6">
          <Button variant="outline" onClick={loadMore}>
            加载更多
          </Button>
        </div>
      )}
    </div>
  );
}