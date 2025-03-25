'use client';

import { useEffect, useState } from 'react';
import { TodoItem } from './todo-item';
import { TodoForm } from './todo-form';
import { TodoFilter } from './todo-filter';
import { useToast } from '@/components/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Plus, ListTodo, Tag, ClipboardList, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TodoTagManager } from './todo-tag-manager';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

// 定义待办事项类型
export interface Todo {
  id: number;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

// 定义标签类型
export interface TodoTag {
  id: number;
  name: string;
  color: string;
}

// 定义带标签的待办事项
export interface TodoWithTags {
  todo: Todo;
  tags: TodoTag[];
}

export function TodoListContainer() {
  const { toast } = useToast();
  const [todos, setTodos] = useState<TodoWithTags[]>([]);
  const [filteredTodos, setFilteredTodos] = useState<TodoWithTags[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: '',
    tagId: 0,
  });

  const fetchTodos = async () => {
    try {
      setIsLoading(true);
      const searchParams = new URLSearchParams();
      
      if (filters.status) searchParams.append('status', filters.status);
      if (filters.priority) searchParams.append('priority', filters.priority);
      if (filters.search) searchParams.append('search', filters.search);
      if (filters.tagId) searchParams.append('tagId', filters.tagId.toString());
      
      const response = await fetch(`/api/todolist/todos?${searchParams.toString()}`);
      
      if (!response.ok) {
        throw new Error('获取待办事项失败');
      }
      
      const data = await response.json();
      setTodos(data);
      setFilteredTodos(data);
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

  useEffect(() => {
    fetchTodos();
  }, [filters]);

  const handleCreateTodo = async (todo: Omit<Todo, 'id' | 'created_at' | 'updated_at' | 'completed_at'>) => {
    try {
      const response = await fetch('/api/todolist/todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(todo),
      });
      
      if (!response.ok) {
        throw new Error('创建待办事项失败');
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
    }
  };

  const handleUpdateTodo = async (todoId: number, todoData: Partial<Todo>) => {
    try {
      const response = await fetch(`/api/todolist/todos/${todoId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(todoData),
      });
      
      if (!response.ok) {
        throw new Error('更新待办事项失败');
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
    }
  };

  const handleDeleteTodo = async (todoId: number) => {
    try {
      const response = await fetch(`/api/todolist/todos/${todoId}`, {
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

  const openEditForm = (todo: Todo) => {
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

  return (
    <div className="space-y-8">
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <ListTodo className="h-4 w-4" />
            待办事项
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
            <Button onClick={() => { setIsFormOpen(true); setEditingTodo(null); }}>
              <Plus className="mr-2 h-4 w-4" /> 添加待办事项
            </Button>
          </div>
          
          <Card className="bg-muted/30">
            <CardHeader className="pt-6">
              <TodoFilter onFilterChange={applyFilters} />
            </CardHeader>
            {isFormOpen && (
            <CardContent className="pt-6">
                <TodoForm 
                  onSubmit={editingTodo ? 
                    (data) => handleUpdateTodo(editingTodo.id, data) : 
                    handleCreateTodo
                  }
                  onCancel={() => { setIsFormOpen(false); setEditingTodo(null); }}
                  initialData={editingTodo || undefined}
                />
              </CardContent>
            )}
          </Card>
          
          <Card className="bg-card shadow">
            <CardContent className="pt-6">
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
                  {filteredTodos.map(({ todo, tags }) => (
                    <TodoItem 
                      key={todo.id} 
                      todo={todo} 
                      tags={tags}
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
