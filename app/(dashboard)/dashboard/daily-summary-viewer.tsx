"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DailySummaryForm } from './daily-summary-form';
import { fetchDailySummary, saveDailySummary } from './actions';
import { 
  Calendar as CalendarIcon, 
  ArrowLeft, 
  ArrowRight, 
  Edit, 
  CalendarDays,
  ChevronRight,
  Star,
  Lightbulb,
  FileText,
  BarChart3,
  History,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  Brain,
  User
} from 'lucide-react';
import { format, subDays, addDays, isToday, isYesterday } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

type SummaryData = {
  date: string;
  completedTasks: string[];
  completionCount: number;
  completionScore: number;
  goodThings: string[];
  learnings: string;
  challenges: string;
  improvements: string;
  mood: string;
  energyLevel: string;
  sleepQuality: string;
  tomorrowGoals: string;
  aiSummary?: string; // 添加AI总结字段
};
interface Result {
  success: boolean
  aiSummary: string
  error: string 
}

export function DailySummaryViewer() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  
  // 添加最近三日和上周总结状态
  const [recentDaysSummary, setRecentDaysSummary] = useState<string | null>(null);
  const [weekSummary, setWeekSummary] = useState<string | null>(null);
  const [isLoadingRecentSummary, setIsLoadingRecentSummary] = useState(false);
  const [isLoadingWeekSummary, setIsLoadingWeekSummary] = useState(false);

  // 添加折叠状态控制
  const [isRecentSummaryExpanded, setIsRecentSummaryExpanded] = useState(false);
  const [isWeekSummaryExpanded, setIsWeekSummaryExpanded] = useState(false);
  
  // 默认选择个人总结区为活跃Tab
  const [activeTab, setActiveTab] = useState("personal");

  // 判断日期类型
  const dateType = isToday(selectedDate) 
    ? 'today' 
    : isYesterday(selectedDate) 
      ? 'yesterday' 
      : 'past';

  // 加载总结数据
  useEffect(() => {
    async function loadSummary() {
      setLoading(true);
      setError('');
      
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const result = await fetchDailySummary(dateStr);
        
        if (result.success && result.data) {
          setSummaryData(result.data.content);
          setAiSummary(result.data.ai_summary);
        } else {
          setSummaryData(null);
          if (result.message) {
            setError(result.message);
          }
        }
      } catch (err) {
        console.error('加载总结数据失败:', err);
        setError('加载数据失败，请稍后再试');
        setSummaryData(null);
      } finally {
        setLoading(false);
      }
    }
    
    loadSummary();
  }, [selectedDate]);

  // 加载最近三日总结
  const loadRecentDaysSummary = async () => {
    setIsLoadingRecentSummary(true);
    try {
      const today = new Date();
      const endDateStr = format(today, 'yyyy-MM-dd');
      
      const response = await fetch('/api/ai/generate-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          dateStr: endDateStr, 
          summaryType: 'three_day' // 修改为与后端一致的类型名
        }),
      });
      
      if (!response.ok) {
        throw new Error('获取最近三日总结失败');
      }
      
      const result = await response.json() as Result;
      if (result.success) {
        setRecentDaysSummary(result.aiSummary);
      } else {
        throw new Error(result.error || '获取最近三日总结失败');
      }
    } catch (error) {
      console.error('加载最近三日总结失败:', error);
    } finally {
      setIsLoadingRecentSummary(false);
    }
  };

  // 加载上周总结
  const loadWeekSummary = async () => {
    setIsLoadingWeekSummary(true);
    try {
      const today = new Date();
      const endDateStr = format(today, 'yyyy-MM-dd');
      
      const response = await fetch('/api/ai/generate-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          dateStr: endDateStr, 
          summaryType: 'weekly' // 确保与后端一致的类型名
        }),
      });
      
      if (!response.ok) {
        throw new Error('获取上周总结失败');
      }
      
      const result = await response.json() as Result;
      if (result.success) {
        setWeekSummary(result.aiSummary);
      } else {
        throw new Error(result.error || '获取上周总结失败');
      }
    } catch (error) {
      console.error('加载上周总结失败:', error);
    } finally {
      setIsLoadingWeekSummary(false);
    }
  };

  // 日期导航
  const goToPreviousDay = () => {
    setSelectedDate(prev => subDays(prev, 1));
  };

  const goToNextDay = () => {
    const tomorrow = addDays(new Date(), 1);
    // 不允许查看未来日期
    if (selectedDate < tomorrow) {
      setSelectedDate(prev => addDays(prev, 1));
    }
  };

  // 格式化日期显示
  const getDateDisplay = () => {
    const dateStr = format(selectedDate, 'yyyy年MM月dd日', { locale: zhCN });
    
    if (isToday(selectedDate)) {
      return `${dateStr} (今天)`;
    } else if (isYesterday(selectedDate)) {
      return `${dateStr} (昨天)`;
    }
    
    return dateStr;
  };

  // 提交表单处理函数
  const handleSubmitSummary = async (data: any) => {
    try {
      // 准备API调用参数
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // 调用API保存数据
      const result = await saveDailySummary(dateStr, data);
      
      if (result.success) {
        // 成功保存后重新加载数据
        const refreshResult = await fetchDailySummary(dateStr);
        if (refreshResult.success && refreshResult.data) {
          setSummaryData(refreshResult.data.content);
          setAiSummary(refreshResult.data.ai_summary);
        }
        
        // 关闭表单
        setIsFormOpen(false);
        return { success: true };
      } else {
        return { success: false, error: result.error || "保存失败" };
      }
    } catch (error) {
      console.error("保存总结出错:", error);
      return { success: false, error: "无法连接服务器" };
    }
  };

  // 获取心情样式
  const getMoodColor = (mood: string) => {
    switch (mood) {
      case '😊':
      case '😃':
        return 'text-green-500';
      case '😐':
        return 'text-amber-500';
      case '😔':
      case '😢':
        return 'text-red-500';
      default:
        return '';
    }
  };

  // 获取能量等级标签
  const getEnergyLabel = (level: string) => {
    switch (level) {
      case 'high': return { label: '充沛', color: 'bg-green-100 text-green-800' };
      case 'medium': return { label: '一般', color: 'bg-amber-100 text-amber-800' };
      case 'low': return { label: '疲惫', color: 'bg-red-100 text-red-800' };
      default: return { label: '未知', color: 'bg-gray-100 text-gray-800' };
    }
  };

  // 获取睡眠质量标签
  const getSleepLabel = (quality: string) => {
    switch (quality) {
      case 'good': return { label: '良好', color: 'bg-green-100 text-green-800' };
      case 'average': return { label: '一般', color: 'bg-amber-100 text-amber-800' };
      case 'poor': return { label: '较差', color: 'bg-red-100 text-red-800' };
      default: return { label: '未知', color: 'bg-gray-100 text-gray-800' };
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
          dateStr: format(selectedDate, 'yyyy-MM-dd'),
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

      // 重新加载数据以获取更新后的总结
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const refreshResult = await fetchDailySummary(dateStr);
      if (refreshResult.success && refreshResult.data) {
        setSummaryData(refreshResult.data.content);
        setAiSummary(refreshResult.data.ai_summary); // 修复拼写错误
      }
    } catch (error) {
      console.error('生成AI总结失败:', error);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <>
      {/* 主卡片 */}
      <Card className="mb-6 overflow-hidden">
        <CardHeader className="pb-0 pt-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center">
              📝 每日总结
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={goToPreviousDay}
                aria-label="前一天"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-8 min-w-[120px] justify-start text-left font-normal text-sm px-3">
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {format(selectedDate, 'MM月dd日', { locale: zhCN })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    disabled={(date) => date > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={goToNextDay}
                disabled={isToday(selectedDate)}
                aria-label="后一天"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsFormOpen(true)}
                aria-label="编辑总结"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-4">
          {loading ? (
            <div className="flex justify-center items-center h-24">
              <div className="spinner h-6 w-6 border-3 border-muted rounded-full border-t-primary animate-spin"></div>
            </div>
          ) : error || !summaryData ? (
            <div className="flex flex-col items-center justify-center space-y-2 py-6">
              <CalendarDays className="h-8 w-8 text-muted-foreground mb-1" />
              <p className="text-muted-foreground text-sm">
                {error || `${format(selectedDate, 'MM月dd日')} 还没有总结记录`}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsFormOpen(true)}
                className="mt-2"
              >
                {dateType === 'past' ? '添加历史总结' : '记录今日总结'}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 顶部统计和状态栏 */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl font-bold">{summaryData.completionScore}<span className="text-sm text-muted-foreground">/10</span></div>
                  <div className="w-px h-8 bg-border"></div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">完成任务</span>
                    <span className="font-medium">{summaryData.completionCount} 项</span>
                  </div>
                  <div className="w-px h-8 bg-border"></div>
                  <div className="text-2xl">
                    <span className={cn("", getMoodColor(summaryData.mood))}>
                      {summaryData.mood}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-1.5">
                  {summaryData.energyLevel && (
                    <Badge variant="outline" className={cn("text-xs py-0 h-5", getEnergyLabel(summaryData.energyLevel).color)}>
                      精力{getEnergyLabel(summaryData.energyLevel).label}
                    </Badge>
                  )}
                  {summaryData.sleepQuality && (
                    <Badge variant="outline" className={cn("text-xs py-0 h-5", getSleepLabel(summaryData.sleepQuality).color)}>
                      睡眠{getSleepLabel(summaryData.sleepQuality).label}
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* 使用Tab切换AI总结区和个人总结区 */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-2 mb-4">
                  <TabsTrigger value="personal" className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    <span>个人总结</span>
                  </TabsTrigger>
                  <TabsTrigger value="ai" className="flex items-center gap-1.5">
                    <Brain className="h-3.5 w-3.5" />
                    <span>AI 总结</span>
                  </TabsTrigger>
                </TabsList>
                
                {/* 个人总结区Tab内容 */}
                <TabsContent value="personal" className="mt-0">
                  <Card>
                    <CardHeader className="pb-2 pt-3">
                      <CardTitle className="text-md font-medium flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-slate-600" /> 个人总结区
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2 pb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 三件好事 */}
                        {summaryData.goodThings?.filter(Boolean).length > 0 && (
                          <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-4 hover:bg-amber-50/80 transition-colors">
                            <div className="flex items-center text-sm font-medium mb-2.5">
                              <Star className="h-4 w-4 mr-2 text-amber-500" />
                              <span className="text-amber-900">三件好事</span>
                            </div>
                            <div className="space-y-2">
                              {summaryData.goodThings.filter(Boolean).map((thing, index) => (
                                thing && (
                                  <div key={index} className="text-sm leading-relaxed pl-1 text-slate-700">
                                    {index + 1}. {thing}
                                  </div>
                                )
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* 学习收获 */}
                        {summaryData.learnings && (
                          <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 hover:bg-blue-50/80 transition-colors">
                            <div className="flex items-center text-sm font-medium mb-2.5">
                              <Lightbulb className="h-4 w-4 mr-2 text-blue-500" />
                              <span className="text-blue-900">今日收获</span>
                            </div>
                            <div className="text-sm leading-relaxed text-slate-700">
                              {summaryData.learnings}
                            </div>
                          </div>
                        )}
                        
                        {/* 遇到的挑战 */}
                        {summaryData.challenges && (
                          <div className="bg-rose-50/50 border border-rose-100 rounded-lg p-4 hover:bg-rose-50/80 transition-colors">
                            <div className="flex items-center text-sm font-medium mb-2.5">
                              <BarChart3 className="h-4 w-4 mr-2 text-rose-500" />
                              <span className="text-rose-900">遇到的挑战</span>
                            </div>
                            <div className="text-sm leading-relaxed text-slate-700">
                              {summaryData.challenges}
                            </div>
                          </div>
                        )}
                        
                        {/* 改进之处 */}
                        {summaryData.improvements && (
                          <div className="bg-purple-50/50 border border-purple-100 rounded-lg p-4 hover:bg-purple-50/80 transition-colors">
                            <div className="flex items-center text-sm font-medium mb-2.5">
                              <Edit className="h-4 w-4 mr-2 text-purple-500" />
                              <span className="text-purple-900">改进之处</span>
                            </div>
                            <div className="text-sm leading-relaxed text-slate-700">
                              {summaryData.improvements}
                            </div>
                          </div>
                        )}
                        
                        {/* 明日目标 */}
                        {summaryData.tomorrowGoals && (
                          <div className="bg-green-50/50 border border-green-100 rounded-lg p-4 hover:bg-green-50/80 transition-colors md:col-span-2">
                            <div className="flex items-center text-sm font-medium mb-2.5">
                              <CalendarIcon className="h-4 w-4 mr-2 text-green-600" />
                              <span className="text-green-900">明日目标</span>
                            </div>
                            <div className="text-sm leading-relaxed whitespace-pre-line text-slate-700">
                              {summaryData.tomorrowGoals}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0 pb-3 justify-center">
                      <Button 
                        variant="ghost" 
                        className="text-sm h-8 text-muted-foreground hover:text-foreground" 
                        onClick={() => setDetailsOpen(true)}
                      >
                        查看完整详情 <ChevronRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </CardFooter>
                  </Card>
                </TabsContent>
                
                {/* AI总结区Tab内容 */}
                <TabsContent value="ai" className="mt-0">
                  <Card className="bg-blue-50/40 border-blue-100">
                    <CardHeader className="pb-2 pt-3">
                      <CardTitle className="text-md font-medium flex items-center">
                        <Brain className="h-4 w-4 mr-2 text-blue-600" /> AI 总结区
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 py-2 pb-4">
                      {/* 今日 AI 总结卡片 */}
                      <div className="bg-white/70 rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between text-sm font-medium mb-3">
                          <div className="flex items-center">
                            <Lightbulb className="h-4 w-4 mr-2 text-blue-600" />
                            <span className="text-blue-900">今日一句话总结</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={generateAISummary}
                            disabled={isGeneratingAI}
                            className="h-7 text-xs px-2.5 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                          >
                            {isGeneratingAI ? 
                              <span className="flex items-center">
                                <span className="mr-1 h-3 w-3 border-2 border-blue-600 rounded-full border-t-transparent animate-spin"></span>
                                生成中...
                              </span> : 
                              aiSummary ? "重新生成" : "生成总结"
                            }
                          </Button>
                        </div>
                        <div className="text-sm leading-relaxed">
                          {aiSummary ? 
                            <p className="text-blue-800">{aiSummary}</p> :
                            <p className="text-muted-foreground italic">AI可以帮你总结这一天的亮点和改进点，点击"生成总结"试试看</p>
                          }
                        </div>
                      </div>
                      
                      {/* 最近三日总结卡片 - 默认折叠 */}
                      <div className="border border-blue-100 rounded-lg overflow-hidden shadow-sm">
                        <div 
                          className="bg-white/80 p-3 flex justify-between items-center cursor-pointer hover:bg-blue-50/60"
                          onClick={() => setIsRecentSummaryExpanded(!isRecentSummaryExpanded)}
                        >
                          <div className="flex items-center text-sm font-medium">
                            <History className="h-4 w-4 mr-2 text-purple-600" />
                            <span className="text-purple-900">最近三日总结</span>
                          </div>
                          <div className="flex items-center">
                            {!recentDaysSummary && !isLoadingRecentSummary && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  loadRecentDaysSummary();
                                }}
                                className="h-7 text-xs mr-1.5 px-2.5 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                              >
                                获取总结
                              </Button>
                            )}
                            {isRecentSummaryExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        
                        {isRecentSummaryExpanded && (
                          <div className="p-4 bg-white/60 border-t border-blue-100">
                            {isLoadingRecentSummary ? (
                              <div className="flex items-center justify-center py-3">
                                <span className="mr-2 h-4 w-4 border-2 border-purple-600 rounded-full border-t-transparent animate-spin"></span>
                                <span className="text-sm text-purple-800">获取中...</span>
                              </div>
                            ) : recentDaysSummary ? (
                              <div className="text-sm text-purple-800 leading-relaxed">
                                {recentDaysSummary}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">
                                点击"获取总结"按钮，AI将分析最近三天的数据并生成总结
                              </p>
                            )}
                            
                            {recentDaysSummary && (
                              <div className="mt-3 flex justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={loadRecentDaysSummary}
                                  className="h-7 text-xs px-2.5 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                                >
                                  刷新总结
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* 上周总结卡片 - 默认折叠 */}
                      <div className="border border-blue-100 rounded-lg overflow-hidden shadow-sm">
                        <div 
                          className="bg-white/80 p-3 flex justify-between items-center cursor-pointer hover:bg-blue-50/60"
                          onClick={() => setIsWeekSummaryExpanded(!isWeekSummaryExpanded)}
                        >
                          <div className="flex items-center text-sm font-medium">
                            <LayoutGrid className="h-4 w-4 mr-2 text-green-600" />
                            <span className="text-green-900">上周总结</span>
                          </div>
                          <div className="flex items-center">
                            {!weekSummary && !isLoadingWeekSummary && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  loadWeekSummary();
                                }}
                                className="h-7 text-xs mr-1.5 px-2.5 text-green-600 hover:text-green-700 hover:bg-green-100"
                              >
                                获取总结
                              </Button>
                            )}
                            {isWeekSummaryExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        
                        {isWeekSummaryExpanded && (
                          <div className="p-4 bg-white/60 border-t border-blue-100">
                            {isLoadingWeekSummary ? (
                              <div className="flex items-center justify-center py-3">
                                <span className="mr-2 h-4 w-4 border-2 border-green-600 rounded-full border-t-transparent animate-spin"></span>
                                <span className="text-sm text-green-800">获取中...</span>
                              </div>
                            ) : weekSummary ? (
                              <div className="text-sm text-green-800 leading-relaxed">
                                {weekSummary}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">
                                点击"获取总结"按钮，AI将分析上周的数据并生成总结
                              </p>
                            )}
                            
                            {weekSummary && (
                              <div className="mt-3 flex justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={loadWeekSummary}
                                  className="h-7 text-xs px-2.5 text-green-600 hover:text-green-700 hover:bg-green-100"
                                >
                                  刷新总结
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 总结表单 */}
      <DailySummaryForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmitSummary}
        completedTasks={[]} // 这里需要从外部传入当天完成的任务
        totalTasks={0} // 这里需要从外部传入任务总数
        summaryDate={dateType === 'today' ? 'today' : 'yesterday'}
      />

      {/* 详情模态框 */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[625px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              📝 {getDateDisplay()} 总结详情
            </DialogTitle>
          </DialogHeader>
          
          {summaryData && (
            <div className="space-y-6 py-2">
              {/* AI总结 */}
              <div className="space-y-3">
                <h3 className="text-md font-medium flex items-center gap-1.5">
                  <Lightbulb className="h-4 w-4 text-blue-600" /> AI 总结
                </h3>
                <div className="relative bg-blue-50 p-4 rounded-md">
                  {summaryData.aiSummary ? (
                    <p className="text-blue-800">{summaryData.aiSummary}</p>
                  ) : (
                    <p className="text-muted-foreground italic">还没有AI总结，可以点击生成按钮创建</p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateAISummary}
                    disabled={isGeneratingAI}
                    className="absolute top-2 right-2 h-7 text-xs px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-100 border-blue-200"
                  >
                    {isGeneratingAI ? 
                      <span className="flex items-center">
                        <span className="mr-1 h-3 w-3 border-2 border-blue-600 rounded-full border-t-transparent animate-spin"></span>
                        生成中...
                      </span> : 
                      summaryData.aiSummary ? "重新生成" : "生成总结"
                    }
                  </Button>
                </div>
              </div>
              
              {/* 完成情况 */}
              <div className="space-y-3">
                <h3 className="text-md font-medium flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary/80" /> 完成情况
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/40 p-3 rounded-md">
                    <div className="text-xs text-muted-foreground">完成任务数</div>
                    <div className="text-xl font-semibold">{summaryData.completionCount}</div>
                  </div>
                  <div className="bg-muted/40 p-3 rounded-md">
                    <div className="text-xs text-muted-foreground">完成度评分</div>
                    <div className="text-xl font-semibold">{summaryData.completionScore}/10</div>
                  </div>
                </div>
                
                {summaryData.completedTasks && summaryData.completedTasks.length > 0 && (
                  <div className="bg-muted/20 rounded-md p-3">
                    <div className="text-sm font-medium mb-2">已完成任务：</div>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {summaryData.completedTasks.map((task, index) => (
                        <li key={index}>{task}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              {/* 三件好事 */}
              {summaryData.goodThings && summaryData.goodThings.filter(Boolean).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-md font-medium flex items-center gap-1.5">
                    <Star className="h-4 w-4 text-amber-500" /> 三件好事
                  </h3>
                  <div className="space-y-2">
                    {summaryData.goodThings.map((thing, index) => (
                      thing && (
                        <div key={index} className="bg-muted/40 p-3 rounded-md">
                          <div className="text-xs font-medium text-muted-foreground mb-1">#{index+1}</div>
                          <div className="text-sm">{thing}</div>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}
              
              {/* 今日反思 */}
              <div className="space-y-3">
                <h3 className="text-md font-medium flex items-center gap-1.5">
                  <Lightbulb className="h-4 w-4 text-blue-500" /> 今日反思
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {summaryData.learnings && (
                    <div className="bg-muted/40 p-3 rounded-md">
                      <div className="text-xs font-medium text-muted-foreground mb-1">今日收获</div>
                      <div className="text-sm">{summaryData.learnings}</div>
                    </div>
                  )}
                  
                  {summaryData.challenges && (
                    <div className="bg-muted/40 p-3 rounded-md">
                      <div className="text-xs font-medium text-muted-foreground mb-1">遇到的挑战</div>
                      <div className="text-sm">{summaryData.challenges}</div>
                    </div>
                  )}
                  
                  {summaryData.improvements && (
                    <div className="bg-muted/40 p-3 rounded-md">
                      <div className="text-xs font-medium text-muted-foreground mb-1">改进之处</div>
                      <div className="text-sm">{summaryData.improvements}</div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 状态指标 */}
              <div className="space-y-3">
                <h3 className="text-md font-medium flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4 text-purple-500" /> 状态与感受
                </h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-muted/40 p-3 rounded-md">
                    <div className="text-xs text-muted-foreground mb-1">心情</div>
                    <div className="text-2xl">{summaryData.mood}</div>
                  </div>
                  
                  <div className="bg-muted/40 p-3 rounded-md">
                    <div className="text-xs text-muted-foreground mb-1">精力水平</div>
                    <div className="text-sm font-medium">
                      {getEnergyLabel(summaryData.energyLevel).label}
                    </div>
                  </div>
                  
                  <div className="bg-muted/40 p-3 rounded-md">
                    <div className="text-xs text-muted-foreground mb-1">睡眠质量</div>
                    <div className="text-sm font-medium">
                      {getSleepLabel(summaryData.sleepQuality).label}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 明日目标 */}
              {summaryData.tomorrowGoals && (
                <div className="space-y-3">
                  <h3 className="text-md font-medium flex items-center gap-1.5">
                    <CalendarIcon className="h-4 w-4 text-green-500" /> 明日目标
                  </h3>
                  <div className="bg-muted/40 p-3 rounded-md whitespace-pre-line text-sm">
                    {summaryData.tomorrowGoals}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setIsFormOpen(true)} size="sm" className="mr-2">
              <Edit className="h-3.5 w-3.5 mr-1.5" /> 编辑总结
            </Button>
            <Button variant="default" onClick={() => setDetailsOpen(false)} size="sm">
              关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
