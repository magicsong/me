'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Heart, Zap, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface DailySnapshot {
  date: string; // YYYY-MM-DD
  year: number;
  score: number; // 完成分数 0-10
  mood?: string; // 心情表情符号
  energy?: string; // 精力状态
  summary: string; // 摘要
}

interface HistoryTodayCardProps {
  userId?: string;
}

export function HistoryTodayCard({ userId = 'default-user' }: HistoryTodayCardProps) {
  const [historyData, setHistoryData] = useState<DailySnapshot[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'high' | 'low'>('all');
  const [loading, setLoading] = useState(false);

  const today = new Date();
  const monthDay = format(today, 'MM-dd');

  // 获取历史数据
  useEffect(() => {
    async function fetchHistoryData() {
      setLoading(true);
      try {
        const response = await fetch(`/api/daily-summary/history-today?monthDay=${monthDay}&userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          setHistoryData(data.data || []);
        } else {
          // 如果 API 不存在，使用模拟数据进行演示
          setHistoryData([
            {
              date: `2025-02-11`,
              year: 2025,
              score: 7,
              mood: '😐',
              energy: '焦虑',
              summary: '当时的你在焦虑方向问题',
            },
            {
              date: `2023-02-11`,
              year: 2023,
              score: 8,
              mood: '😊',
              energy: '充沛',
              summary: '第一次做稳定性机制拆解',
            },
          ]);
        }
      } catch (error) {
        console.error('获取历史数据失败:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchHistoryData();
  }, [monthDay, userId]);

  // 根据筛选应用过滤
  const filteredData = useMemo(() => {
    let filtered = historyData;

    if (filterMode === 'high') {
      filtered = filtered.filter(item => item.score >= 7);
    } else if (filterMode === 'low') {
      filtered = filtered.filter(item => item.score < 7);
    }

    return filtered;
  }, [historyData, filterMode]);

  // 显示的数据（默认最多2条，展开后全部显示）
  const displayData = isExpanded ? filteredData : filteredData.slice(0, 2);

  // 如果没有数据
  if (historyData.length === 0 && !loading) {
    return null;
  }

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 dark:text-green-400';
    if (score >= 6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 8) return 'bg-green-100 dark:bg-green-950';
    if (score >= 6) return 'bg-yellow-100 dark:bg-yellow-950';
    return 'bg-red-100 dark:bg-red-950';
  };

  return (
    <Card className="overflow-hidden mb-6">
      <div className="h-1 w-full bg-gradient-to-r from-blue-400 to-purple-400" />

      {/* 标题 */}
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            时间镜像 · {monthDay}
          </span>
        </div>
      </CardHeader>

      {/* 内容 */}
      <CardContent className="space-y-3 pb-4">
        {loading ? (
          <div className="text-center py-4 text-sm text-muted-foreground">加载中...</div>
        ) : displayData.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">暂无历史记录</div>
        ) : (
          <>
            {/* 历史快照列表 */}
            <div className="space-y-3">
              {displayData.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-border/50 p-3 hover:border-border hover:bg-muted/50 transition-colors"
                >
                  {/* 时间和分数 */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {item.year === new Date().getFullYear() ? '去年' : `${new Date().getFullYear() - item.year}年前`} · {item.year}
                      </span>
                    </div>
                    <div className={`rounded-full px-2.5 py-1 text-sm font-semibold ${getScoreBg(item.score)} ${getScoreColor(item.score)}`}>
                      {item.score}/10
                    </div>
                  </div>

                  {/* 心情和精力标签 */}
                  <div className="flex gap-2 mb-2">
                    {item.mood && (
                      <Badge variant="outline" className="text-xs bg-pink-50 dark:bg-pink-950 border-pink-200 dark:border-pink-800">
                        <Heart className="w-3 h-3 mr-1" />
                        {item.mood}
                      </Badge>
                    )}
                    {item.energy && (
                      <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                        <Zap className="w-3 h-3 mr-1" />
                        {item.energy}
                      </Badge>
                    )}
                  </div>

                  {/* 摘要 */}
                  <p className="text-sm text-muted-foreground italic mb-0">
                    "{item.summary}"
                  </p>
                </div>
              ))}
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border/30">
              {/* 展开/收起 */}
              {filteredData.length > 2 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-8 px-3 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="w-3 h-3 mr-1" />
                      收起
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3 mr-1" />
                      展开全部 ({filteredData.length})
                    </>
                  )}
                </Button>
              )}

              {/* 筛选按钮 */}
              {historyData.length > 0 && (
                <>
                  <Button
                    variant={filterMode === 'high' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setFilterMode(filterMode === 'high' ? 'all' : 'high');
                      setIsExpanded(false);
                    }}
                    className="h-8 px-3 text-xs font-medium"
                  >
                    仅看高分日
                  </Button>
                  <Button
                    variant={filterMode === 'low' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setFilterMode(filterMode === 'low' ? 'all' : 'low');
                      setIsExpanded(false);
                    }}
                    className="h-8 px-3 text-xs font-medium"
                  >
                    仅看低谷日
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
