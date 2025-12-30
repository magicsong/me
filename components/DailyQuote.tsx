"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Quote, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from '@/components/hooks/use-toast';

// 从API获取每日格言
async function fetchQuote() {
  try {
    const today = format(new Date(), 'yyyy-MM-dd');
    const response = await fetch('/api/ai/daily-quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ dateStr: today }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '获取格言失败');
    }

    const data = await response.json();
    return {
      content: data.dailyQuote,
      author: data.author || 'AI原创',
      theme: data.theme,
    };
  } catch (error) {
    console.error('获取每日格言失败:', error);
    throw error;
  }
}

export function DailyQuote() {
  const [quote, setQuote] = useState({ content: "", author: "", theme: "" });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const getQuote = async () => {
    try {
      setLoading(true);
      const fetchedQuote = await fetchQuote();
      setQuote(fetchedQuote);
      // 不再请求额外 AI 建议，组件已由 AI 生成格言内容
    } catch (error) {
      console.error("获取每日格言失败:", error);
      toast({
        title: "获取格言失败",
        description: error instanceof Error ? error.message : "请稍后再试",
        variant: "destructive",
      });
      setQuote({
        content: "今天是新的一天，充满无限可能。",
        author: "未知",
        theme: "鼓励",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  useEffect(() => {
    getQuote();
  }, []);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await getQuote();
  };
  
  return (
    <Card className="h-full">
      <div className="h-1.5 w-full rainbow-flow rounded-t-md" />
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Quote className="h-4 w-4 text-primary" />
            每日格言
            {quote.theme && <span className="text-xs text-muted-foreground ml-2">· {quote.theme}</span>}
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6" 
            onClick={handleRefresh}
            disabled={loading || refreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-16">
            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <div>
            <div 
              className={`relative overflow-hidden transition-all duration-200 ${
                expanded ? "max-h-full" : "max-h-20"
              }`}
            >
              <blockquote className="italic text-sm text-gray-600">
                "{quote.content}"
              </blockquote>
              {!expanded && quote.content.length > 100 && (
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent"></div>
              )}
            </div>
            
            <div className="mt-2 flex justify-between items-center">
              <div className="text-xs text-muted-foreground">
                — {quote.author}
              </div>
              
              {quote.content.length > 100 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setExpanded(!expanded)} 
                  className="h-6 px-2 text-xs text-primary"
                >
                  {expanded ? (
                    <div className="flex items-center gap-1">
                      <span>收起</span>
                      <ChevronUp className="h-3 w-3" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span>展开</span>
                      <ChevronDown className="h-3 w-3" />
                    </div>
                  )}
                </Button>
              )}
            </div>

            {/* 无需额外 AI 建议显示（格言已由 AI 生成） */}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
