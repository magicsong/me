"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Quote, ChevronDown, ChevronUp } from 'lucide-react';

// 假设从API获取每日格言
async function fetchQuote() {
  // 这里应该是实际获取格言的逻辑
  // 临时使用示例数据
  return {
    content: "生活中最重要的不是我们身处何地，而是我们朝什么方向前进。有时候，最简单的习惯改变可以带来最深远的影响。每一天的小进步，累积起来就是巨大的成就。坚持下去，你会看到自己的潜力有多大。记住，成功不在于做了多少事，而在于每天都在朝着目标前进，不断成长和学习。",
    author: "奥利弗·温德尔·霍姆斯",
  };
}

export function DailyQuote() {
  const [quote, setQuote] = useState({ content: "", author: "" });
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  
  useEffect(() => {
    const getQuote = async () => {
      try {
        const fetchedQuote = await fetchQuote();
        setQuote(fetchedQuote);
      } catch (error) {
        console.error("获取每日格言失败:", error);
        setQuote({
          content: "今天是新的一天，充满无限可能。",
          author: "未知"
        });
      } finally {
        setLoading(false);
      }
    };
    
    getQuote();
  }, []);
  
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Quote className="h-4 w-4 text-primary" />
          每日格言
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
