'use client';

import { useState, useRef } from 'react';
import { CalendarIcon, Edit2, Play, BrainCircuit, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PlanResultTimelineView } from './PlanResultTimelineView';
import { cn } from '@/lib/utils';
import { format, addDays, subDays, endOfDay, subDays as dateFnsSubDays } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlanResult, PlanScheduleItem, TodoBO } from '@/app/api/todo/types';
import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { TimelineComponent, TimelineItem } from './timeline/timeline-component';

interface PomodoroSession {
  todoId: number;
  startTime: string;
  endTime: string;
  completed?: boolean;
}

interface DailyTimelineViewProps {
  todos: TodoBO[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onUpdateTodoTime: (todoId: number, startTime: string, endTime: string) => void;
  onStartPomodoro: (todoId: number) => void;
  onEditTodo: (todo: TodoBO) => void;
  workingHours?: { start: number; end: number }; // 工作时间配置
  pomodoroSessions?: PomodoroSession[]; // 番茄钟分配
}

export function DailyTimelineView({
  todos,
  selectedDate,
  onDateChange,
  onUpdateTodoTime,
  onStartPomodoro,
  onEditTodo,
  workingHours = { start: 9, end: 22 }, // 默认工作时间为早上9点到晚上10点
  pomodoroSessions = [],
}: DailyTimelineViewProps) {
  const [isAiPlanning, setIsAiPlanning] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [userPrompt, setUserPrompt] = useState('');
  const [showPlanResult, setShowPlanResult] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [planResult, setPlanResult] = useState<PlanResult | null>(null);
  
  // 处理日期切换
  const handlePreviousDay = () => {
    onDateChange(subDays(selectedDate, 1));
  };
  
  const handleNextDay = () => {
    onDateChange(addDays(selectedDate, 1));
  };
  
  const handleTodayClick = () => {
    onDateChange(new Date());
  };

  // 处理AI规划
  const handleAiPlan = async () => {
    setPlanDialogOpen(true);
  };

  // 调用内部的AI规划API
  const callAiPlanApi = async (prompt: string): Promise<PlanResult> => {
    try {
      const response = await fetch('/api/todo/planner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userPrompt: prompt,
          timeRange: `${workingHours.start}:00-${workingHours.end}:00` // 根据当前工作时间设置
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || '规划请求失败');
      }

      return data.data;
    } catch (error) {
      console.error('API请求失败:', error);
      throw new Error('无法连接到规划服务');
    }
  };

  
  // 内部保存规划结果的方法
  const saveScheduleInternally = async (schedule: PlanScheduleItem[]): Promise<void> => {
    try {
      // 将规划结果转换为任务更新
      const updatePromises = schedule.map(item => {
        // 尝试转换string类型的taskId为number
        const todoId = Number(item.taskId);
        
        if (isNaN(todoId)) {
          console.warn(`无效的任务ID: ${item.taskId}`);
          return Promise.resolve();
        }
        
        // 解析时间字符串
        const parseTimeString = (timeStr: string): Date => {
          const [hours, minutes] = timeStr.split(':').map(Number);
          const date = new Date(selectedDate);
          date.setHours(hours, minutes, 0, 0);
          return date;
        };
        
        const startTime = parseTimeString(item.startTime);
        const endTime = parseTimeString(item.endTime);
        
        // 调用更新函数
        return onUpdateTodoTime(todoId, startTime.toISOString(), endTime.toISOString());
      });
      
      await Promise.all(updatePromises.filter(Boolean));
      toast.success(`成功更新 ${schedule.length} 个任务的时间安排`);
    } catch (error) {
      console.error('保存规划结果失败:', error);
      throw new Error('更新任务时间失败');
    }
  };

  // 执行AI规划
  const executeAiPlan = async () => {
    if (!userPrompt.trim()) {
      toast.error("请输入规划需求");
      return;
    }

    setIsAiPlanning(true);
    setPlanDialogOpen(false);
    
    try {
      // 优先使用外部提供的规划函数，如果没有则使用内部实现
      const result = await callAiPlanApi(userPrompt);
      setPlanResult(result);
      setShowPlanResult(true);
      toast.success("AI已完成今日任务规划");
    } catch (error) {
      console.error('AI规划失败:', error);
      toast.error(error instanceof Error ? error.message : "AI规划失败，请稍后重试");
    } finally {
      setIsAiPlanning(false);
    }
  };

  // 保存规划结果
const savePlanResult = async (updatedPlan: PlanResult) => {
  if (!updatedPlan || !updatedPlan.schedule || updatedPlan.schedule.length === 0) {
    toast.error("没有可保存的规划结果");
    return;
  }

  try {
    await saveScheduleInternally(updatedPlan.schedule);
    setShowPlanResult(false);
    toast.success("规划已保存并应用到任务时间");
  } catch (error) {
    console.error('保存规划失败:', error);
    toast.error(error instanceof Error ? error.message : "保存规划失败");
  }
};

// 取消规划结果
const cancelPlanResult = () => {
  setShowPlanResult(false);
};

  // 将待办事项转换为时间线项目
  const convertTodosToTimelineItems = (): TimelineItem[] => {
    return todos
      .filter(todo => todo.plannedStartTime && todo.plannedEndTime)
      .map(todo => ({
        id: todo.id,
        type: 'todo',
        title: todo.title,
        startTime: todo.plannedStartTime,
        endTime: todo.plannedEndTime,
        priority: todo.priority,
        draggable: true,
        metadata: todo
      }));
  };

  // 将番茄钟会话转换为时间线项目
  const convertPomodorosToTimelineItems = (): TimelineItem[] => {
    return pomodoroSessions.map((session, index) => ({
      id: `pomodoro-${session.todoId}-${index}`,
      type: 'pomodoro',
      title: `番茄钟 #${index + 1}`,
      startTime: session.startTime,
      endTime: session.endTime,
      draggable: false,
      metadata: session
    }));
  };

  // 获取所有时间线项目
  const getTimelineItems = (): TimelineItem[] => {
    const todoItems = convertTodosToTimelineItems();
    const pomodoroItems = convertPomodorosToTimelineItems();
    return [...todoItems, ...pomodoroItems];
  };

  // 处理项目拖放
  const handleItemDrop = (itemId: string | number, newStartHour: number, newEndHour: number) => {
    const todoId = Number(itemId);
    if (isNaN(todoId)) return;

    const startDate = new Date(selectedDate);
    startDate.setHours(newStartHour, 0, 0, 0);
    
    const endDate = new Date(selectedDate);
    endDate.setHours(newEndHour, 0, 0, 0);
    
    onUpdateTodoTime(todoId, startDate.toISOString(), endDate.toISOString());
  };

  // 渲染自定义项目内容
  const renderCustomItemContent = (item: TimelineItem) => {
    if (item.type === 'todo') {
      const todo = item.metadata as TodoBO;
      return (
        <div className="flex justify-between items-start">
          <span className="font-medium truncate">{item.title}</span>
          <div className="flex gap-1">
            <button 
              className="text-blue-600 hover:text-blue-800 p-0.5 rounded-sm"
              onClick={(e) => {
                e.stopPropagation();
                onEditTodo(todo);
              }}
            >
              <Edit2 className="h-3 w-3" />
            </button>
            <button 
              className="text-green-600 hover:text-green-800 p-0.5 rounded-sm"
              onClick={(e) => {
                e.stopPropagation();
                onStartPomodoro(todo.id);
              }}
            >
              <Play className="h-3 w-3" />
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="flex items-center justify-between">
        <span className="font-medium">{item.title}</span>
        {item.type === 'pomodoro' && <Badge className="bg-red-500 text-xs">🍅</Badge>}
      </div>
    );
  };

  // 渲染小时装饰器
  const renderHourDecorator = (hour: number) => {
    const hourPomodoros = pomodoroSessions.filter(session => {
      const startTime = new Date(session.startTime);
      const endTime = new Date(session.endTime);
      return startTime.getHours() <= hour && endTime.getHours() > hour;
    });
    
    if (hourPomodoros.length > 0) {
      return (
        <Badge className="mt-1 bg-red-500 text-white text-xs">
          {hourPomodoros.length}🍅
        </Badge>
      );
    }
    
    return null;
  };

  // 将当前未计划的待办事项添加到时间块
  const addTodoToTimeBlock = (todoId: number, hour: number) => {
    const startHour = hour;
    const endHour = hour + 1;
    
    const startDate = new Date(selectedDate);
    startDate.setHours(startHour, 0, 0, 0);
    
    const endDate = new Date(selectedDate);
    endDate.setHours(endHour, 0, 0, 0);
    
    onUpdateTodoTime(todoId, startDate.toISOString(), endDate.toISOString());
  };

  // 渲染未计划的待办事项列表
  const renderUnscheduledTodos = () => {
    const unscheduledTodos = todos.filter(todo => !todo.plannedStartTime);
    
    return (
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">未计划的待办事项</h3>
        {unscheduledTodos.length === 0 ? (
          <p className="text-muted-foreground">没有未计划的待办事项</p>
        ) : (
          <div className="flex flex-col gap-2">
            {unscheduledTodos.map(todo => (
              <Card key={todo.id} className="border">
                <CardContent className="flex items-center justify-between p-3">
                  <span className="font-medium">{todo.title}</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setIsAddingTimeBlock(true);
                      addTodoToTimeBlock(todo.id, 8); // 默认添加到8点
                    }}
                  >
                    添加到时间块
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  };

  // 渲染今日番茄钟统计
  const renderPomodoroStats = () => {
    // 计算今日番茄钟总数
    const totalPomodoros = pomodoroSessions.length;
    // 计算已完成的番茄钟数量
    const completedPomodoros = pomodoroSessions.filter(s => s.completed).length;
    // 计算总专注时间（分钟）
    const totalMinutes = pomodoroSessions.reduce((acc, session) => {
      if (!session.completed) return acc;
      const start = new Date(session.startTime);
      const end = new Date(session.endTime);
      return acc + (end.getTime() - start.getTime()) / (1000 * 60);
    }, 0);

    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-red-500" />
              <h3 className="font-medium">今日番茄钟</h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="font-medium">{completedPomodoros}/{totalPomodoros}</span> 个番茄钟
              </div>
              <div className="text-sm">
                <span className="font-medium">{Math.floor(totalMinutes / 60)}</span> 小时 
                <span className="font-medium"> {Math.round(totalMinutes % 60)}</span> 分钟
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // 将规划结果渲染到时间线上
  // ...existing code...

// 将规划结果渲染到时间线上
const renderPlannedSchedule = () => {
  if (!planResult || !showPlanResult) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-auto p-6">
        <PlanResultTimelineView
          planResult={planResult}
          date={selectedDate}
          workingHours={workingHours}
          onSavePlan={savePlanResult}
          onCancel={cancelPlanResult}
        />
      </div>
    </div>
  );
};

  // 获取所有时间线项目
  const timelineItems = getTimelineItems();

  return (
    <div className="space-y-6">
      {/* 日期选择器和功能按钮 */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={handlePreviousDay}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            前一天
          </Button>
          <Button variant="outline" size="sm" onClick={handleNextDay}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            后一天
          </Button>
          <Button variant="outline" size="sm" onClick={handleTodayClick}>
            今天
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleAiPlan}
            disabled={isAiPlanning}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
          >
            {isAiPlanning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                规划中...
              </>
            ) : (
              <>
                <BrainCircuit className="mr-2 h-4 w-4" />
                AI自动规划
              </>
            )}
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"ghost"}
                className={cn(
                  "justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? (
                  format(selectedDate, "yyyy年MM月dd日")
                ) : (
                  <span>选择日期</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={onDateChange}
                disabled={(date) =>
                  date > endOfDay(new Date()) || date < dateFnsSubDays(new Date(), 365)
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      {/* AI规划对话框 */}
      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>AI自动规划</DialogTitle>
            <DialogDescription>
              请输入您今天的规划需求，例如"我希望今天高效完成所有紧急任务，中午有1小时的午休时间"
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="prompt">规划需求</Label>
              <Textarea
                id="prompt"
                placeholder="请输入您的规划需求..."
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                className="h-32"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPlanDialogOpen(false)}>
              取消
            </Button>
            <Button type="button" onClick={executeAiPlan}>
              开始规划
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 规划结果展示 */}
      {renderPlannedSchedule()}
      
      {/* 番茄钟统计 */}
      {pomodoroSessions.length > 0 && renderPomodoroStats()}
      
      {/* 时间轴视图 - 使用TimelineComponent */}
      <div className="overflow-x-auto" ref={timelineRef}>
        <TimelineComponent
          items={timelineItems}
          workingHours={workingHours}
          date={selectedDate}
          hourHeight={100}
          showNonWorkingHours={true}
          collapsedRestHours={true}
          onItemDrop={handleItemDrop}
          onItemClick={(item) => {
            if (item.type === 'todo' && item.metadata) {
              onEditTodo(item.metadata as TodoBO);
            }
          }}
          renderCustomItemContent={renderCustomItemContent}
          renderHourDecorator={renderHourDecorator}
        />
      </div>
      
      {/* 未计划的待办事项 */}
      {renderUnscheduledTodos()}
    </div>
  );
}