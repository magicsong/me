"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DailyWelcome } from "@/components/daily-start/daily-welcome";
import { DailyPlanning } from "@/components/daily-start/daily-planning";
import { DailyTimelineView } from "@/components/daily-timeline-view";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PomodoroBO, TodoBO } from "@/app/api/types";

export default function DailyStartPage() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [todos, setTodos] = useState<TodoBO[]>([]);
  const [todosYesterday, setTodosYesterday] = useState<TodoBO[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [pomodoroSessions, setPomodoroSessions] = useState<PomodoroBO[]>([]);
  const [activeTab, setActiveTab] = useState("planning");
  const router = useRouter();

  useEffect(() => {
    fetchTodos();
    fetchYesterdayTodos();
    fetchPomodoros();
  }, [router, selectedDate]);

  // 检查是否已经显示过今天的欢迎页
  useEffect(() => {
    const today = new Date().toDateString();
    const lastWelcomeDate = localStorage.getItem("lastWelcomeDate");

    if (lastWelcomeDate === today) {
      setShowWelcome(false);
    }
  }, []);

  async function fetchPomodoros() {
    const date = new Date();
    const formattedDate = date.toISOString().split('T')[0];
    // Get next day for date range
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayFormatted = nextDay.toISOString().split('T')[0];
    const response = await fetch(`/api/pomodoro?createdAt_gte=${formattedDate}&createdAt_lt=${nextDayFormatted}`);

    if (!response.ok) {
      throw new Error('获取番茄钟记录失败');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error('获取番茄钟记录失败' + data.error);
    }
    setPomodoroSessions(data.data);
  }
  async function fetchTodos() {
    try {
      // 获取选中日期的0点时间
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);

      // 获取选中日期的23:59:59时间
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      // 使用范围查询运算符，精确获取当天的待办事项
      const response = await fetch(
        `/api/todo?plannedDate_gte=${startOfDay.toISOString()}&plannedDate_lte=${endOfDay.toISOString()}`
      );

      const result = await response.json();

      if (result.success) {
        setTodos(result.data as TodoBO[]);
      } else {
        console.error('获取待办事项失败:', result.error);
        toast.error("获取待办事项失败");
      }
    } catch (error) {
      console.error('获取待办事项出错:', error);
      toast.error("获取待办事项出错");
    }
  }

  async function fetchYesterdayTodos() {
    try {
      // 获取今天0点的时间
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // 使用小于运算符获取所有过去的待办事项（包括昨天）
      const response = await fetch(`/api/todo?plannedDate_lt=${todayStart.toISOString()}&status_ne=completed`);
      const result = await response.json();

      if (result.success) {
        setTodosYesterday(result.data);
      } else {
        console.error('获取昨日待办事项失败:', result.error);
      }
    } catch (error) {
      console.error('获取昨日待办事项出错:', error);
    }
  }

  async function handleUpdateTodo(todo: Partial<TodoBO>) {
    try {
      const response = await fetch('/api/todo/' + todo.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: todo }),
      });

      const result = await response.json();

      if (result.success) {
        // 更新本地状态
        setTodos(prevTodos =>
          prevTodos.map(item =>
            item.id === todo.id ? { ...item, todo: result.data } : item
          )
        );
        toast.success("更新成功");
        return true;
      } else {
        toast.error("更新失败", { description: result.error });
        return false;
      }
    } catch (error) {
      console.error('更新待办事项出错:', error);
      toast.error("更新出错");
      return false;
    }
  }

  async function handleUpdateTodoTime(todoId: number, startTime: string, endTime: string) {
    const updatedTodo = {
      id: todoId,
      plannedStartTime: startTime,
      plannedEndTime: endTime
    };

    return handleUpdateTodo(updatedTodo);
  }

  async function handleStartPomodoro(todoId: number) {
    // 直接导航到pomodoro页面，可以通过URL参数传递todo的ID
    router.push(`/pomodoro?todoId=${todoId}`);
  }

  // 用于刷新今日和昨日的待办事项数据
  function handleDataRefresh() {
    fetchTodos();
    fetchYesterdayTodos();
  }

  function handleStartDay() {
    setShowWelcome(false);
    localStorage.setItem("lastWelcomeDate", new Date().toDateString());
  }

  if (showWelcome) {
    return <DailyWelcome onStart={handleStartDay} />;
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <h1 className="text-2xl font-bold">开始今天</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full md:w-[400px] grid-cols-2">
          <TabsTrigger value="planning">日常规划</TabsTrigger>
          <TabsTrigger value="timeline">时间线视图</TabsTrigger>
        </TabsList>

        <TabsContent value="planning" className="mt-4">
          <DailyPlanning
            todos={todos}
            yesterdayTodos={todosYesterday}
            onUpdateTodo={handleUpdateTodo}
            onChangeTab={() => setActiveTab("timeline")}
            onDataRefresh={handleDataRefresh}
          />
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <DailyTimelineView
            todos={todos}
            pomodoroSessions={pomodoroSessions}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onUpdateTodoTime={handleUpdateTodoTime}
            onStartPomodoro={handleStartPomodoro}
            onEditTodo={(todo) => {
              // 编辑待办事项逻辑
              // 可以实现一个编辑对话框
              console.log("Edit todo:", todo);
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
