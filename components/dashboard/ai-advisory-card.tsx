"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface AIAdvisoryCardProps {
  habitCompletionRate?: number;
  notesCount?: number;
}

export function AIAdvisoryCard({ 
  habitCompletionRate = 0, 
  notesCount = 0 
}: AIAdvisoryCardProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const generateSuggestions = async () => {
    try {
      setLoading(true);
      // 基于用户数据生成建议
      const advices: string[] = [];

      if (habitCompletionRate < 50) {
        advices.push('今天的习惯完成度较低，建议从最重要的习惯开始做起。');
      } else if (habitCompletionRate >= 80) {
        advices.push('🎉 今天的习惯完成度很高，保持这个势头！');
      }

      if (notesCount === 0) {
        advices.push('📝 记录今天的想法和发现，能帮助你更好地反思。');
      } else if (notesCount > 5) {
        advices.push('💡 你今天思考很活跃，考虑整理和分类这些笔记。');
      }

      // 如果没有特定建议，提供通用建议
      if (advices.length === 0) {
        const defaultAdvices = [
          '⏰ 专注当下的任务，把今日的重点任务完成。',
          '🌟 记得给自己一个休息时间，工作和休息同样重要。',
          '🎯 检查你的进度，确保朝着目标前进。'
        ];
        advices.push(defaultAdvices[Math.floor(Math.random() * defaultAdvices.length)]);
      }

      setSuggestions(advices.slice(0, 2)); // 只显示2条建议
    } catch (error) {
      console.error('生成建议失败:', error);
      toast.error('生成建议失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateSuggestions();
  }, [habitCompletionRate, notesCount]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await generateSuggestions();
      toast.success('已刷新建议');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Card className="border-purple-200 bg-purple-50/30">
      <div className="h-1.5 w-full rainbow-flow rounded-t-md" />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-purple-500" />
            <CardTitle className="text-sm font-medium">今日建议</CardTitle>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-1 hover:bg-purple-100 rounded transition-colors disabled:opacity-50"
            title="刷新建议"
          >
            <RefreshCw className={`h-4 w-4 text-purple-500 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-xs text-muted-foreground">正在生成建议...</div>
        ) : suggestions.length > 0 ? (
          <div className="space-y-2">
            {suggestions.map((suggestion, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="text-sm text-foreground leading-relaxed flex-1">
                  {suggestion}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">暂无建议</p>
        )}
      </CardContent>
    </Card>
  );
}
