"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormattedText } from '@/components/ui/formatted-text';
import {
  Brain,
  Lightbulb,
  History,
  LayoutGrid,
} from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';

interface Result {
  success: boolean;
  data?: any;
  error?: string;
}

interface AISummarySectionProps {
  currentDate: Date;
  className?: string;
}

// Tab类型定义
type TabType = 'daily' | 'recent' | 'weekly';

export function AISummarySection({
  currentDate,
  className = ""
}: AISummarySectionProps) {
  // 状态管理
  const [activeTab, setActiveTab] = useState<TabType>('daily');
  const [recentDaysSummary, setRecentDaysSummary] = useState<string | null>(null);
  const [weekSummary, setWeekSummary] = useState<string | null>(null);
  const [isLoadingRecentSummary, setIsLoadingRecentSummary] = useState(false);
  const [isLoadingWeekSummary, setIsLoadingWeekSummary] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(false);

  // 加载AI总结
  const loadAISummary = async (type: TabType) => {
    // Set appropriate loading state based on type
    if (type === 'daily') {
      setInitialLoading(true);
    } else if (type === 'recent') {
      setIsLoadingRecentSummary(true);
    } else if (type === 'weekly') {
      setIsLoadingWeekSummary(true);
    }

    try {
      let startDateStr, endDateStr, kind;
      const today = new Date();

      // Configure parameters based on summary type
      if (type === 'daily') {
        startDateStr = format(currentDate, 'yyyy-MM-dd');
        endDateStr = format(currentDate, 'yyyy-MM-dd');
        kind = 'daily_summary';
      } else if (type === 'recent') {
        startDateStr = format(subDays(today, 3), 'yyyy-MM-dd');
        endDateStr = format(today, 'yyyy-MM-dd');
        kind = 'three_day_summary';
      } else if (type === 'weekly') {
        const lastWeekStart = startOfWeek(subDays(today, 7));
        const lastWeekEnd = endOfWeek(subDays(today, 7));
        startDateStr = format(lastWeekStart, 'yyyy-MM-dd');
        endDateStr = format(lastWeekEnd, 'yyyy-MM-dd');
        kind = 'weekly_summary';
      }

      const response = await fetch(
        `/api/ai/insight?startDate=${startDateStr}&endDate=${endDateStr}&kind=${kind}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        throw new Error(`获取${type}总结失败`);
      }

      const result = await response.json() as Result;
      if (result.success && result.data?.length > 0) {
        // Set appropriate state based on type
        if (type === 'daily') {
          setAiSummary(result.data[0].content);
        } else if (type === 'recent') {
          setRecentDaysSummary(result.data[0].content);
        } else if (type === 'weekly') {
          setWeekSummary(result.data[0].content);
        }
      }
    } catch (error) {
      console.error(`加载${type}总结数据失败:`, error);
    } finally {
      // Reset loading state
      if (type === 'daily') {
        setInitialLoading(false);
      } else if (type === 'recent') {
        setIsLoadingRecentSummary(false);
      } else if (type === 'weekly') {
        setIsLoadingWeekSummary(false);
      }
    }
  };
  // 生成AI总结
  const generateAISummary = async () => {
    setIsGeneratingAI(true);
    try {
      // 通过API调用生成AI总结
      const response = await fetch('/api/ai/generate-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateStr: format(currentDate, 'yyyy-MM-dd'),
          summaryType: 'daily'
        }),
      });

      if (!response.ok) {
        throw new Error('AI请求失败');
      }

      const result = await response.json() as Result;
      if (!result.success) {
        throw new Error(result.error || '生成AI总结失败');
      }
      setAiSummary(result.aiSummary);
    } catch (error) {
      console.error('生成AI总结失败:', error);
    } finally {
      setIsGeneratingAI(false);
    }
  };
  // 生成上周总结
  const generateAISummaryByType = async (type: TabType) => {
    // Set appropriate loading state based on type
    if (type === 'daily') {
      setIsGeneratingAI(true);
    } else if (type === 'recent') {
      setIsLoadingRecentSummary(true);
    } else if (type === 'weekly') {
      setIsLoadingWeekSummary(true);
    }
    
    try {
      const today = new Date();
      let dateStr, startDate, endDate;
      
      // Configure parameters based on summary type
      if (type === 'daily') {
        dateStr = format(currentDate, 'yyyy-MM-dd');
      } else if (type === 'recent') {
        startDate = format(subDays(today, 3), 'yyyy-MM-dd');
        endDate = format(today, 'yyyy-MM-dd');
        dateStr = endDate;
      } else if (type === 'weekly') {
        const lastWeekStart = startOfWeek(subDays(today, 7));
        const lastWeekEnd = endOfWeek(subDays(today, 7));
        startDate = format(lastWeekStart, 'yyyy-MM-dd');
        endDate = format(lastWeekEnd, 'yyyy-MM-dd');
        dateStr = endDate;
      }

      const requestBody: any = {
        dateStr,
        summaryType: type,
      };
      
      if (type !== 'daily') {
        requestBody.startDate = startDate;
        requestBody.endDate = endDate;
      }

      const response = await fetch('/api/ai/generate-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`创建${type}总结失败`);
      }

      const result = await response.json() as Result;
      if (result.success) {
        // Set appropriate state based on type
        if (type === 'daily') {
          setAiSummary(result.aiSummary);
        } else if (type === 'recent') {
          setRecentDaysSummary(result.data.content);
        } else if (type === 'weekly') {
          setWeekSummary(result.data.content);
        }
      }
    } catch (error) {
      console.error(`创建${type}总结失败:`, error);
    } finally {
      // Reset loading state
      if (type === 'daily') {
        setIsGeneratingAI(false);
      } else if (type === 'recent') {
        setIsLoadingRecentSummary(false);
      } else if (type === 'weekly') {
        setIsLoadingWeekSummary(false);
      }
    }
  };

  // Function aliases for UI handlers
  const generateWeekSummary = () => generateAISummaryByType('weekly');
  const generateRecentDaysSummary = () => generateAISummaryByType('recent');
  // Tab数据
  const tabs = [
    {
      id: 'daily',
      title: '今日总结',
      icon: <Lightbulb className="h-4 w-4 mr-2 text-blue-600" />,
      color: 'blue'
    },
    {
      id: 'recent',
      title: '最近三日',
      icon: <History className="h-4 w-4 mr-2 text-purple-600" />,
      color: 'purple'
    },
    {
      id: 'weekly',
      title: '上周总结',
      icon: <LayoutGrid className="h-4 w-4 mr-2 text-green-600" />,
      color: 'green'
    }
  ];

  // 根据当前选中Tab执行加载操作
  const handleTabAction = (tabId: TabType) => {
    loadAISummary(tabId);
  };

  // 切换Tab时执行相应操作
  useEffect(() => {
    handleTabAction(activeTab);
  }, [activeTab]);

  return (
    <Card className={`bg-blue-50/40 border-blue-100 ${className}`}>
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-md font-medium flex items-center">
          <Brain className="h-4 w-4 mr-2 text-blue-600" /> AI 总结区
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2 pb-4">
        <div className="flex">
          {/* 左侧Tab栏 */}
          <div className="w-1/5 pr-3 border-r border-blue-100">
            <div className="flex flex-col space-y-1">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "secondary" : "ghost"}
                  className={`justify-start h-auto py-2 px-3 font-normal ${activeTab === tab.id
                      ? `bg-${tab.color}-100 text-${tab.color}-800`
                      : `hover:bg-${tab.color}-50 text-muted-foreground`
                    }`}
                  onClick={() => setActiveTab(tab.id as TabType)}
                >
                  <div className="flex items-center">
                    {tab.icon}
                    <span>{tab.title}</span>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* 右侧内容区 */}
          <div className="w-4/5 pl-4">
            {/* 今日一句话总结 */}
            {activeTab === 'daily' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-blue-900">今日一句话总结</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={generateAISummary}
                    disabled={isGeneratingAI || initialLoading}
                    className="h-7 text-xs px-2.5 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                  >
                    {(isGeneratingAI || initialLoading) ?
                      <span className="flex items-center">
                        <span className="mr-1 h-3 w-3 border-2 border-blue-600 rounded-full border-t-transparent animate-spin"></span>
                        {isGeneratingAI ? "生成中..." : "加载中..."}
                      </span> :
                      aiSummary ? "重新生成" : "生成总结"
                    }
                  </Button>
                </div>
                <div className="bg-white/70 rounded-lg p-4 shadow-sm">
                  {aiSummary ?
                    <FormattedText text={aiSummary} className="text-sm text-blue-800 leading-relaxed" /> :
                    <p className="text-sm text-muted-foreground italic">
                      {initialLoading ? "正在加载AI总结..." : "AI可以帮你总结这一天的亮点和改进点"}
                    </p>
                  }
                </div>
              </div>
            )}

            {/* 最近三日总结 */}
            {activeTab === 'recent' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-purple-900">最近三日总结</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={generateRecentDaysSummary}
                    disabled={isLoadingRecentSummary}
                    className="h-7 text-xs px-2.5 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                  >
                    {isLoadingRecentSummary ?
                      <span className="flex items-center">
                        <span className="mr-1 h-3 w-3 border-2 border-purple-600 rounded-full border-t-transparent animate-spin"></span>
                        获取中...
                      </span> :
                      recentDaysSummary ? "刷新总结" : "获取总结"
                    }
                  </Button>
                </div>
                <div className="bg-white/70 rounded-lg p-4 shadow-sm">
                  {isLoadingRecentSummary ? (
                    <div className="flex items-center justify-center py-3">
                      <span className="mr-2 h-4 w-4 border-2 border-purple-600 rounded-full border-t-transparent animate-spin"></span>
                      <span className="text-sm text-purple-800">获取中...</span>
                    </div>
                  ) : recentDaysSummary ? (
                    <FormattedText text={recentDaysSummary} className="text-sm text-purple-800 leading-relaxed" />
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      AI将分析最近三天的数据并生成总结
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 上周总结 */}
            {activeTab === 'weekly' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-green-900">上周总结</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={generateWeekSummary}
                    disabled={isLoadingWeekSummary}
                    className="h-7 text-xs px-2.5 text-green-600 hover:text-green-700 hover:bg-green-100"
                  >
                    {isLoadingWeekSummary ?
                      <span className="flex items-center">
                        <span className="mr-1 h-3 w-3 border-2 border-green-600 rounded-full border-t-transparent animate-spin"></span>
                        获取中...
                      </span> :
                      weekSummary ? "刷新总结" : "获取总结"
                    }
                  </Button>
                </div>
                <div className="bg-white/70 rounded-lg p-4 shadow-sm">
                  {isLoadingWeekSummary ? (
                    <div className="flex items-center justify-center py-3">
                      <span className="mr-2 h-4 w-4 border-2 border-green-600 rounded-full border-t-transparent animate-spin"></span>
                      <span className="text-sm text-green-800">获取中...</span>
                    </div>
                  ) : weekSummary ? (
                    <FormattedText text={weekSummary} className="text-sm text-green-800 leading-relaxed" />
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      AI将分析上周的数据并生成总结
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}