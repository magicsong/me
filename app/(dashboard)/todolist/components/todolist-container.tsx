'use client';

import { useEffect, useState } from 'react';
import { TodoItem } from './todo-item';
import { TodoForm } from './todo-form';
import { TodoFilter } from './todo-filter';
import { useToast } from '@/components/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Plus, ListTodo, Tag, ClipboardList, AlertCircle, Sparkles, Calendar } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TodoTagManager } from './todo-tag-manager';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { TodoAutoPlan } from './todo-auto-plan';
import { DailyTimelineView } from './daily-timeline-view';
import { TagBO, TodoBO } from '@/app/api/types';
import { fetchTodosByDate } from '../../actions';
import { BaseResponse } from '@/lib/types';
import { createTodo } from '../../habits/client-actions';

// 新增：番茄钟会话记录类型
export interface PomodoroSession {
  id: number;
  todo_id: number;
  start_time: string;
  end_time: string;
  duration: number;
  is_completed: boolean;
  created_at: string;
}

export function TodoListContainer() {
  const { toast } = useToast();
  const [todos, setTodos] = useState<TodoBO[]>([]);
  const [filteredTodos, setFilteredTodos] = useState<TodoBO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<TodoBO | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: '',
    tagId: 0,
  });
  // 添加自动规划相关状态
  const [isAutoPlanOpen, setIsAutoPlanOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<TagBO[]>([]);
  // 新增：时间视图相关状态
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [pomodoroSessions, setPomodoroSessions] = useState<PomodoroSession[]>([]);
  const [timeViewTodos, setTimeViewTodos] = useState<TodoBO[]>([]);

  const fetchTodos = async () => {
    try {
      setIsLoading(true);
      const searchParams = new URLSearchParams();

      if (filters.status) searchParams.append('status', filters.status);
      if (filters.priority) searchParams.append('priority', filters.priority);
      if (filters.search) searchParams.append('search', filters.search);
      if (filters.tagId) searchParams.append('tagId', filters.tagId.toString());

      const response = await fetch(`/api/todo?${searchParams.toString()}`);

      if (!response.ok) {
        throw new Error('获取待办事项失败');
      }

      const data = await response.json();
      setTodos(data.data);
      setFilteredTodos(data.data);
    } catch (error) {
      console.error('获取待办事项失败:', error);
      toast({
        title: "错误",
        description: "获取待办事项失败，请稍后再试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 添加获取所有标签的方法
  const fetchAllTags = async () => {
    try {
      const response = await fetch('/api/tag');
      if (!response.ok) {
        throw new Error('获取标签失败');
      }
      const data = await response.json();
      setAvailableTags(data);
    } catch (error) {
      console.error('获取标签失败:', error);
      toast({
        title: "错误",
        description: "获取标签失败",
        variant: "destructive",
      });
    }
  };

  // 修改useEffect，初始化时获取标签
  useEffect(() => {
    fetchTodos();
    fetchAllTags();
  }, [filters]);

  const handleCreateTodo = async (todo: Omit<TodoBO, 'id' | 'created_at' | 'updated_at' | 'completed_at'>, tagIds: number[]) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/todo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({data:todo}),
      });

      if (!response.ok) {
        throw new Error('创建待办事项失败');
      }

      // 获取新创建的待办事项ID
      const newTodo = await response.json().data;

      // 确保有待办事项ID才进行标签关联
      if (newTodo && newTodo.id) {
        // 如果有选择标签，则关联标签
        if (tagIds && tagIds.length > 0) {
          const tagResponse = await fetch(`/api/todolist/todos/${newTodo.id}/tags`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ tagIds }),
          });

          if (!tagResponse.ok) {
            console.error('标签关联失败');
            toast({
              title: "警告",
              description: "待办事项已创建，但标签关联失败",
              variant: "warning",
            });
          }
        }
      }

      await fetchTodos();
      setIsFormOpen(false);
      toast({
        title: "成功",
        description: "待办事项已创建",
      });
    } catch (error) {
      console.error('创建待办事项失败:', error);
      toast({
        title: "错误",
        description: "创建待办事项失败",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateTodo = async (todoId: number, todoData: Partial<Todo>, tagIds?: number[]) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/todo/${todoId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(todoData),
      });

      if (!response.ok) {
        throw new Error('更新待办事项失败');
      }

      // 如果提供了标签IDs，则更新标签关联
      if (tagIds !== undefined) {
        const tagResponse = await fetch(`/api/todolist/todos/${todoId}/tags`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tagIds }),
        });

        if (!tagResponse.ok) {
          console.error('标签关联更新失败');
          toast({
            title: "警告",
            description: "待办事项已更新，但标签关联失败",
            variant: "warning",
          });
        }
      }

      await fetchTodos();
      setEditingTodo(null);
      setIsFormOpen(false);
      toast({
        title: "成功",
        description: "待办事项已更新",
      });
    } catch (error) {
      console.error('更新待办事项失败:', error);
      toast({
        title: "错误",
        description: "更新待办事项失败",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTodo = async (todoId: number) => {
    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('删除待办事项失败');
      }

      await fetchTodos();
      toast({
        title: "成功",
        description: "待办事项已删除",
      });
    } catch (error) {
      console.error('删除待办事项失败:', error);
      toast({
        title: "错误",
        description: "删除待办事项失败",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (todoId: number, newStatus: 'pending' | 'in_progress' | 'completed' | 'archived') => {
    await handleUpdateTodo(todoId, { status: newStatus });
  };

  const openEditForm = (todo: TodoBO) => {
    setEditingTodo(todo);
    setIsFormOpen(true);
  };

  const applyFilters = (newFilters: typeof filters) => {
    setFilters({ ...filters, ...newFilters });
  };

  const startPomodoro = async (todoId: number) => {
    try {
      // 重定向到番茄钟页面并传递待办事项ID
      window.location.href = `/pomodoro?todoId=${todoId}`;
    } catch (error) {
      console.error('启动番茄钟失败:', error);
      toast({
        title: "错误",
        description: "启动番茄钟失败",
        variant: "destructive",
      });
    }
  };

  // 添加批量创建待办事项功能
  const handleBatchCreateTodos = async (
    todos: Omit<TodoBO, 'id' | 'created_at' | 'updated_at' | 'completed_at'>[],
    tagNamesArray: string[][]
  ) => {
    try {
      setIsLoading(true);

      // 存储创建的待办事项和对应的标签
      const createdTodos = [];

      // 逐个创建待办事项
      for (let i = 0; i < todos.length; i++) {
        const todo = todos[i];
        const tagNames = tagNamesArray[i];

        // 创建待办事项
        try {
          const newTodo = await createTodo(todo);
          createdTodos.push(newTodo);
        } catch (error) {
          console.log(error, "创建第" + i + "个待办项失败");
          throw new Error("创建第" + i + "个待办项失败");
        }

        // 处理标签（如果有）
        if (tagNames && tagNames.length > 0) {
          // 为每个新标签名创建标签
          const tagIds = [];

          for (const tagName of tagNames) {
            // 检查标签是否已存在
            const existingTag = availableTags.find(t => t.name.toLowerCase() === tagName.toLowerCase());

            if (existingTag) {
              tagIds.push(existingTag.id);
            } else {
              // 创建新标签
              const tagResponse = await fetch('/api/tag', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: tagName, color: generateRandomColor() }),
              });

              if (tagResponse.ok) {
                const newTag = await tagResponse.json();
                tagIds.push(newTag.id);
              }
            }
          }

          // 关联标签到待办事项
          if (tagIds.length > 0) {
            await fetch(`/api/todo/${newTodo.id}/tag`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tagIds }),
            });
          }
        }
      }

      // 刷新待办事项列表
      await fetchTodos();
      // 刷新标签列表
      await fetchAllTags();
      // 关闭自动规划界面
      setIsAutoPlanOpen(false);

      toast({
        title: "成功",
        description: `成功创建了 ${createdTodos.length} 个待办事项`,
      });
    } catch (error) {
      console.error('批量创建待办事项失败:', error);
      toast({
        title: "错误",
        description: "批量创建待办事项失败",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 生成随机颜色
  const generateRandomColor = () => {
    const colors = [
      'red', 'blue', 'green', 'yellow', 'purple',
      'pink', 'orange', 'cyan', 'teal', 'indigo'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // 新增：获取指定日期的番茄钟记录
  const fetchPomodoroSessions = async (date: Date) => {
    try {
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
      setPomodoroSessions(data);
    } catch (error) {
      console.error('获取番茄钟记录失败:', error);
      toast({
        title: "错误",
        description: "获取番茄钟记录失败",
        variant: "destructive",
      });
    }
  };

  // 新增：获取指定日期的待办事项（用于时间视图）
  const fetchTimeViewTodos = async (date: Date) => {
    try {
      const response: BaseResponse<TodoBO> = await fetchTodosByDate(date);
      if (response.success) {
        setTimeViewTodos(response.data);
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('获取日程待办事项失败:', error);
      toast({
        title: "错误",
        description: "获取日程待办事项失败",
        variant: "destructive",
      });
    }
  };

  // 新增：更新待办事项的计划时间
  const updateTodoPlannedTime = async (todoId: number, startTime: string, endTime: string) => {
    try {
      await handleUpdateTodo(todoId, {
        planned_start_time: startTime,
        planned_end_time: endTime
      });

      // 重新获取时间视图所需数据
      fetchTimeViewTodos(selectedDate);
    } catch (error) {
      console.error('更新计划时间失败:', error);
      toast({
        title: "错误",
        description: "更新计划时间失败",
        variant: "destructive",
      });
    }
  };

  // 处理日期变更
  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    fetchPomodoroSessions(date);
    fetchTimeViewTodos(date);
  };

  // 在现有useEffect之后添加一个新的useEffect来处理时间视图的初始化
  useEffect(() => {
    if (selectedDate) {
      fetchPomodoroSessions(selectedDate);
      fetchTimeViewTodos(selectedDate);
    }
  }, [selectedDate]);

  return (
    <div className="space-y-8">
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <ListTodo className="h-4 w-4" />
            待办事项
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            时间视图
          </TabsTrigger>
          <TabsTrigger value="tags" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            标签管理
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <ClipboardList className="h-6 w-6" />
              我的待办事项
            </h2>
            <div className="flex gap-2">
              <Button
                onClick={() => { setIsAutoPlanOpen(true); setIsFormOpen(false); setEditingTodo(null); }}
                variant="outline"
              >
                <Sparkles className="mr-2 h-4 w-4" /> AI自动规划
              </Button>
              <Button onClick={() => { setIsFormOpen(true); setIsAutoPlanOpen(false); setEditingTodo(null); }}>
                <Plus className="mr-2 h-4 w-4" /> 添加待办事项
              </Button>
            </div>
          </div>

          <Card className="bg-card shadow">
            <CardHeader className="pt-6">
              <TodoFilter onFilterChange={applyFilters} />
            </CardHeader>
            <CardContent className="pt-0 space-y-6">
              {isAutoPlanOpen && (
                <div className="pt-4 pb-4 border-b">
                  <TodoAutoPlan
                    onCreateTodos={handleBatchCreateTodos}
                    onCancel={() => setIsAutoPlanOpen(false)}
                    availableTags={availableTags}
                  />
                </div>
              )}

              {isFormOpen && (
                <div className="pt-4 pb-4 border-b">
                  <TodoForm
                    onSubmit={editingTodo ?
                      (data, tagIds) => handleUpdateTodo(editingTodo.id, data, tagIds) :
                      handleCreateTodo
                    }
                    onCancel={() => { setIsFormOpen(false); setEditingTodo(null); }}
                    initialData={editingTodo || undefined}
                  />
                </div>
              )}

              {isLoading ? (
                <div className="py-20 text-center flex flex-col items-center justify-center">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
                  <p className="text-lg text-muted-foreground">正在加载您的待办事项...</p>
                </div>
              ) : filteredTodos.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center justify-center space-y-4">
                  <div className="bg-muted/50 p-6 rounded-full">
                    <ClipboardList className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xl font-medium mb-2">暂无待办事项</p>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                      点击上方的"添加待办事项"按钮开始创建您的第一个任务
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => { setIsFormOpen(true); setEditingTodo(null); }}
                    className="mt-4"
                  >
                    <Plus className="mr-2 h-4 w-4" /> 创建新待办事项
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTodos.map((todo) => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      tags={todo.tags}
                      onEdit={() => openEditForm(todo)}
                      onDelete={() => handleDeleteTodo(todo.id)}
                      onToggleStatus={(status) => handleToggleStatus(todo.id, status)}
                      onStartPomodoro={() => startPomodoro(todo.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 新增的时间视图标签内容 */}
        <TabsContent value="timeline" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              每日时间规划
            </h2>
          </div>

          <Card className="bg-card shadow">
            <CardContent className="pt-6">
              <DailyTimelineView
                todos={timeViewTodos}
                pomodoroSessions={pomodoroSessions}
                selectedDate={selectedDate}
                onDateChange={handleDateChange}
                onUpdateTodoTime={updateTodoPlannedTime}
                onStartPomodoro={startPomodoro}
                onEditTodo={(todo) => openEditForm(todo)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tags">
          <Card>
            <CardContent className="pt-6">
              <TodoTagManager onTagsChange={fetchTodos} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
