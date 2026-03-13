"use client";

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import { addDays, format, isSameDay, isToday, isYesterday, parseISO, subDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Brain,
  CalendarDays,
  Calendar as CalendarIcon,
  CheckCircle,
  ChevronRight,
  Circle,
  Copy,
  Edit,
  FileText,
  Lightbulb,
  Star,
  User
} from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { fetchDailySummary, saveDailySummary } from './actions';
import { AISummarySection } from './components/ai-summary-section';
import { DailySummaryForm, FailedHabit, TaskDisplayGroup } from './daily-summary-form';
import { getHabits } from '../habits/client-actions';
import { DailySummaryContext, TodoBO } from '@/app/api/types';
import { fetchTodosByDate } from '../actions';

type SummaryData = DailySummaryContext

export function DailySummaryViewer() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]); // 完成的普通任务（扁平，用于提交）
  const [completedHabits, setCompletedHabits] = useState<string[]>([]); // 完成的习惯任务
  const [failedTasks, setFailedTasks] = useState<string[]>([]); // 未完成的普通任务（扁平，用于提交）
  const [failedHabits, setFailedHabits] = useState<FailedHabit[]>([]); // 未完成的习惯
  const [completedTaskGroups, setCompletedTaskGroups] = useState<TaskDisplayGroup[]>([]); // 完成任务分组（用于展示）
  const [failedTaskGroups, setFailedTaskGroups] = useState<TaskDisplayGroup[]>([]); // 未完成任务分组（用于展示）
  const [totalTasks, setTotalTasks] = useState(0);
  const [habitsLoading, setHabitsLoading] = useState(false);

  // 默认选择个人总结区为活跃Tab
  const [activeTab, setActiveTab] = useState("personal");

  // 判断日期类型
  const dateType = useMemo(() => {
    return isToday(selectedDate)
      ? 'today'
      : isYesterday(selectedDate)
        ? 'yesterday'
        : 'past';
  }, [selectedDate]);

  // 加载总结数据
  useEffect(() => {
    async function loadSummary() {
      setLoading(true);
      setError('');

      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const result = await fetchDailySummary(dateStr);

        if (result.success && result.data) {
          setSummaryData(result.data.content as DailySummaryContext || null);
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
    loadHabitsData(); // 在日期改变时也加载习惯数据
    loadTodosData();  // 在日期改变时也加载任务数据
  }, [selectedDate]);

  // 加载任务数据
  const loadTodosData = async () => {
    try {
      const result = await fetchTodosByDate(selectedDate);

      if (result.success && result.data) {
        const isCompletedOnSelectedDate = (completedAt?: string) => {
          if (!completedAt) return false;
          return isSameDay(parseISO(completedAt), selectedDate);
        };

        const todos = result.data as TodoBO[];
        const completedList: string[] = [];
        const failedList: string[] = [];
        const completedGroups: TaskDisplayGroup[] = [];
        const failedGroups: TaskDisplayGroup[] = [];
        let totalCount = 0;

        for (const todo of todos) {
          if (isCompletedOnSelectedDate(todo.completedAt)) {
            // 父任务本身已完成，直接记录
            completedList.push(todo.title);
            completedGroups.push({ parentTitle: todo.title, subtasks: [] });
            totalCount += 1;
          } else if (todo.subtasks && todo.subtasks.length > 0) {
            // 父任务未完成但有子任务，按子任务维度统计
            totalCount += todo.subtasks.length;
            const doneSubs = todo.subtasks
              .filter(s => isCompletedOnSelectedDate(s.completedAt))
              .map(s => s.title);
            const failSubs = todo.subtasks
              .filter(s => !s.completedAt && s.priority !== 'low' && s.status === 'in_progress')
              .map(s => s.title);
            if (doneSubs.length > 0) {
              completedList.push(...doneSubs);
              completedGroups.push({ parentTitle: todo.title, subtasks: doneSubs });
            }
            if (failSubs.length > 0) {
              failedList.push(...failSubs);
              failedGroups.push({ parentTitle: todo.title, subtasks: failSubs });
            }
          } else {
            // 普通任务（无子任务）
            totalCount += 1;
            if (todo.priority !== 'low' && todo.status === 'in_progress') {
              failedList.push(todo.title);
              failedGroups.push({ parentTitle: todo.title, subtasks: [] });
            }
          }
        }

        setCompletedTasks(completedList);
        setFailedTasks(failedList);
        setCompletedTaskGroups(completedGroups);
        setFailedTaskGroups(failedGroups);
        setTotalTasks(totalCount);
      }
      else {
        setCompletedTasks([]);
        setFailedTasks([]);
        setCompletedTaskGroups([]);
        setFailedTaskGroups([]);
        setTotalTasks(0);
      }
    } catch (err) {
      console.error('加载任务数据失败:', err);
    }
  };
  // 加载习惯数据
  const loadHabitsData = async () => {
    setHabitsLoading(true);
    try {
      const result = await getHabits(selectedDate);
      if (result.length > 0) {
        // 过滤出已完成的习惯
        const completed = result.filter((habit) => habit.completedToday);
        // 过滤出未完成的习惯
        const failed = result.filter((habit) => habit.failedToday);

        // 直接设置习惯数据，不再添加前缀
        setCompletedHabits(completed.map(habit => habit.name));
        // 设置未完成习惯数据（保留更多信息）
        setFailedHabits(failed.map(habit => ({
          name: habit.name,
          failReason: habit.failureReason || '未记录失败原因',
          id: habit.id || 0,
        })));
      } else {
        setCompletedHabits([]);
        setFailedHabits([]);
        setTotalTasks(0);
      }
    } catch (err) {
      console.error('加载习惯数据失败:', err);
      setCompletedHabits([]);
      setFailedHabits([]);
    } finally {
      setHabitsLoading(false);
    }
  };

  // 打开表单前确保已加载最新的习惯数据
  const handleOpenForm = async () => {
    if (!habitsLoading) {
      await loadHabitsData();
    }
    setIsFormOpen(true);
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
      // 将复杂的failedHabits对象数组转换为格式化字符串数组
      // 格式: "习惯名称 (之前已坚持X天): 未完成原因"
      const formattedFailedHabits = data.failedHabits?.map((habit: FailedHabit) => {
        let habitStr = habit.name;

        // 添加坚持天数信息（如果有）
        if (habit.streak && habit.streak > 0) {
          habitStr += ` (之前已坚持${habit.streak}天)`;
        }

        // 添加未完成原因（如果有）
        if (habit.failReason && habit.failReason !== '未记录失败原因') {
          habitStr += `: ${habit.failReason}`;
        }

        return habitStr;
      }) || [];

      // 创建要提交的数据对象，替换原始failedHabits
      const submitData = {
        ...data,
        failedHabits: formattedFailedHabits
      };

      // 调用API保存数据
      const result = await saveDailySummary(dateStr, submitData);

      if (result.success) {
        // 成功保存后重新加载数据
        const refreshResult = await fetchDailySummary(dateStr);
        if (refreshResult.success && refreshResult.data) {
          setSummaryData(refreshResult.data.content);
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

  // 格式化总结内容为清晰的文本
  const formatSummaryForCopy = () => {
    if (!summaryData) return '';

    let text = `📝 ${getDateDisplay()} 每日总结\n`;
    text += `${'='.repeat(50)}\n\n`;

    // 统计信息
    text += `✨ 每日成绩\n`;
    text += `完成分数: ${summaryData.completionScore}/10\n`;
    text += `完成任务: ${summaryData.completionCount} 项\n`;
    text += `心情: ${summaryData.mood}\n`;
    
    if (summaryData.energyLevel) {
      text += `精力: ${getEnergyLabel(summaryData.energyLevel).label}\n`;
    }
    if (summaryData.sleepQuality) {
      text += `睡眠: ${getSleepLabel(summaryData.sleepQuality).label}\n`;
    }
    text += '\n';

    // 完成的任务和习惯
    if (completedHabits.length > 0 || completedTasks.length > 0) {
      text += `✅ 今日完成\n`;
      if (completedHabits.length > 0) {
        text += `  习惯:\n`;
        completedHabits.forEach(habit => {
          text += `    • ${habit}\n`;
        });
      }
      if (completedTasks.length > 0) {
        text += `  任务:\n`;
        if (completedTaskGroups.length > 0) {
          completedTaskGroups.forEach(group => {
            if (group.subtasks.length > 0) {
              text += `    • ${group.parentTitle}\n`;
              group.subtasks.forEach(sub => {
                text += `      ◦ ${sub}\n`;
              });
            } else {
              text += `    • ${group.parentTitle}\n`;
            }
          });
        } else {
          completedTasks.forEach(task => {
            text += `    • ${task}\n`;
          });
        }
      }
      text += '\n';
    }

    // 未完成的任务和习惯
    if (failedHabits.length > 0 || failedTasks.length > 0) {
      text += `❌ 未完成\n`;
      if (failedHabits.length > 0) {
        text += `  习惯:\n`;
        failedHabits.forEach(habit => {
          text += `    • ${habit.name} - ${habit.failReason}\n`;
        });
      }
      if (failedTasks.length > 0) {
        text += `  任务:\n`;
        if (failedTaskGroups.length > 0) {
          failedTaskGroups.forEach(group => {
            if (group.subtasks.length > 0) {
              text += `    • ${group.parentTitle}\n`;
              group.subtasks.forEach(sub => {
                text += `      ◦ ${sub}\n`;
              });
            } else {
              text += `    • ${group.parentTitle}\n`;
            }
          });
        } else {
          failedTasks.forEach(task => {
            text += `    • ${task}\n`;
          });
        }
      }
      text += '\n';
    }

    // 三件好事
    if (summaryData.goodThings?.filter(Boolean).length > 0) {
      text += `⭐ 三件好事\n`;
      summaryData.goodThings.filter(Boolean).forEach((thing, index) => {
        text += `  ${index + 1}. ${thing}\n`;
      });
      text += '\n';
    }

    // 学习收获
    if (summaryData.learnings) {
      text += `💡  今日收获\n`;
      text += `${summaryData.learnings}\n\n`;
    }

    // 遇到的挑战
    if (summaryData.challenges) {
      text += `⚡ 遇到的挑战\n`;
      text += `${summaryData.challenges}\n\n`;
    }

    // 改进之处
    if (summaryData.improvements) {
      text += `🔧  改进之处\n`;
      text += `${summaryData.improvements}\n\n`;
    }

    // 明日目标
    if (summaryData.tomorrowGoals) {
      text += `🎯 明日目标\n`;
      text += `${summaryData.tomorrowGoals}\n`;
    }

    return text;
  };

  // 复制总结到剪贴板
  const handleCopySummary = async () => {
    const summaryText = formatSummaryForCopy();

    const showFeedback = (message: string, success = true) => {
      const feedback = document.createElement('div');
      feedback.className = `fixed top-4 right-4 ${success ? 'bg-green-500' : 'bg-red-500'} text-white px-4 py-2 rounded-lg shadow-lg z-50`;
      feedback.textContent = message;
      document.body.appendChild(feedback);
      setTimeout(() => feedback.remove(), 2000);
    };

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(summaryText);
        showFeedback('✓ 已复制到剪贴板', true);
        return;
      }

      // Fallback for environments without navigator.clipboard
      const textarea = document.createElement('textarea');
      textarea.value = summaryText;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      const successful = document.execCommand && document.execCommand('copy');
      document.body.removeChild(textarea);

      if (successful) {
        showFeedback('✓ 已复制到剪贴板', true);
      } else {
        throw new Error('复制失败');
      }
    } catch (err) {
      console.error('复制失败:', err);
      showFeedback('✗ 复制失败，请重试', false);
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
                onClick={() => handleOpenForm()}
                aria-label="编辑总结"
              >
                <Edit className="h-4 w-4" />
              </Button>

              {summaryData && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopySummary}
                  aria-label="复制总结"
                  title="复制格式化的总结"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
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
                onClick={() => handleOpenForm()}
                className="mt-2"
              >
                {dateType === 'today'
                  ? '记录今日总结'
                  : dateType === 'yesterday'
                    ? '记录昨日总结'
                    : '添加历史总结'
                }
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
                      {/* 任务和习惯完成情况 */}
                      {(completedHabits.length > 0 || completedTasks.length > 0 || failedHabits.length > 0 || failedTasks.length > 0) && (
                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-4 hover:bg-indigo-50/80 transition-colors md:col-span-2">
                          <div className="flex items-center text-sm font-medium mb-3">
                            <CheckCircle className="h-4 w-4 mr-2 text-indigo-500" />
                            <span className="text-indigo-900">
                              {dateType === 'today' ? '今日完成' : dateType === 'yesterday' ? '昨日完成' : '当日完成'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* 习惯完成情况 */}
                            {completedHabits.length > 0 && (
                              <div>
                                <h4 className="text-xs font-medium text-indigo-700 mb-2">习惯</h4>
                                <div className="space-y-1.5">
                                  {completedHabits.map((habit, index) => (
                                    <div key={`habit-${index}`} className="flex items-center">
                                      <CheckCircle className="h-3.5 w-3.5 text-green-500 mr-2" />
                                      <span className="text-sm text-slate-700">{habit}</span>
                                    </div>
                                  ))}
                                  {failedHabits.map((habit, index) => (
                                    <div key={`failed-habit-${index}`} className="flex items-center opacity-60">
                                      <Circle className="h-3.5 w-3.5 text-gray-400 mr-2" />
                                      <span className="text-sm text-slate-500 line-through">{habit.name}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* 任务完成情况 */}
                            {(completedTasks.length > 0 || failedTasks.length > 0) && (
                              <div>
                                <h4 className="text-xs font-medium text-indigo-700 mb-2">任务</h4>
                                <div className="space-y-1.5">
                                  {completedTaskGroups.length > 0 ? (
                                    completedTaskGroups.map((group, groupIndex) => (
                                      group.subtasks.length > 0 ? (
                                        <div key={`task-group-${groupIndex}`} className="space-y-1">
                                          <div className="flex items-center">
                                            <CheckCircle className="h-3.5 w-3.5 text-indigo-400 mr-2" />
                                            <span className="text-xs font-medium text-slate-600">{group.parentTitle}</span>
                                          </div>
                                          <div className="pl-5 space-y-1">
                                            {group.subtasks.map((task, subIndex) => (
                                              <div key={`task-${groupIndex}-${subIndex}`} className="flex items-center">
                                                <CheckCircle className="h-3.5 w-3.5 text-green-500 mr-2" />
                                                <span className="text-sm text-slate-700">{task}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ) : (
                                        <div key={`task-group-${groupIndex}`} className="flex items-center">
                                          <CheckCircle className="h-3.5 w-3.5 text-green-500 mr-2" />
                                          <span className="text-sm text-slate-700">{group.parentTitle}</span>
                                        </div>
                                      )
                                    ))
                                  ) : (
                                    completedTasks.map((task, index) => (
                                      <div key={`task-${index}`} className="flex items-center">
                                        <CheckCircle className="h-3.5 w-3.5 text-green-500 mr-2" />
                                        <span className="text-sm text-slate-700">{task}</span>
                                      </div>
                                    ))
                                  )}

                                  {failedTaskGroups.length > 0 ? (
                                    failedTaskGroups.map((group, groupIndex) => (
                                      group.subtasks.length > 0 ? (
                                        <div key={`failed-task-group-${groupIndex}`} className="space-y-1 opacity-60">
                                          <div className="flex items-center">
                                            <Circle className="h-3.5 w-3.5 text-gray-400 mr-2" />
                                            <span className="text-xs font-medium text-slate-500">{group.parentTitle}</span>
                                          </div>
                                          <div className="pl-5 space-y-1">
                                            {group.subtasks.map((task, subIndex) => (
                                              <div key={`failed-task-${groupIndex}-${subIndex}`} className="flex items-center">
                                                <Circle className="h-3.5 w-3.5 text-gray-400 mr-2" />
                                                <span className="text-sm text-slate-500 line-through">{task}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ) : (
                                        <div key={`failed-task-group-${groupIndex}`} className="flex items-center opacity-60">
                                          <Circle className="h-3.5 w-3.5 text-gray-400 mr-2" />
                                          <span className="text-sm text-slate-500 line-through">{group.parentTitle}</span>
                                        </div>
                                      )
                                    ))
                                  ) : (
                                    failedTasks.map((task, index) => (
                                      <div key={`failed-task-${index}`} className="flex items-center opacity-60">
                                        <Circle className="h-3.5 w-3.5 text-gray-400 mr-2" />
                                        <span className="text-sm text-slate-500 line-through">{task}</span>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
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
                  <AISummarySection
                    currentDate={selectedDate}
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 总结表单 */}
      {/* 总结表单 */}
      <DailySummaryForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmitSummary}
        completedTasks={completedTasks}
        completedHabits={completedHabits}
        failedTasks={failedTasks}
        failedHabits={failedHabits}
        totalTasks={totalTasks}
        summaryDate={dateType === 'today' ? 'today' : 'yesterday'}
        completedTaskGroups={completedTaskGroups}
        failedTaskGroups={failedTaskGroups}
      />

      {/* 详情模态框 */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[625px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              📝 {getDateDisplay()} 总结详情
            </DialogTitle>
          </DialogHeader>

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
