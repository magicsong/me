import React, { useState, useEffect } from 'react';
import { TodoBO } from "@/app/api/types";
import { TodoItem } from "./todo-item";
import { TodoFilter } from "./todo-filter";
import { TodoCreationForm } from "./todo-creation-form";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTrigger
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { deleteTodo } from '@/app/(dashboard)/habits/client-actions';

interface Tag {
  id: number;
  name: string;
  color: string;
}

interface TodoListProps {
  tags: Tag[];
  onUpdateTodo?: (todo: TodoBO) => Promise<boolean>;
  onCompleteTodo?: (todoId: number) => Promise<boolean>;
  onCreateTodo?: (todo: Partial<TodoBO>) => Promise<boolean>;
}

export function TodoList({
  tags,
  onUpdateTodo,
  onCompleteTodo,
  onCreateTodo
}: TodoListProps) {
  const [todos, setTodos] = useState<TodoBO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTodos, setSelectedTodos] = useState<number[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");

  // 获取待办事项
  const fetchTodos = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/todo?status=${activeTab}`);
      const result = await response.json();

      if (result.success) {
        setTodos(result.data);
      } else {
        console.error('获取待办事项失败:', result.error);
        toast.error("获取待办事项失败");
      }
    } catch (error) {
      console.error('获取待办事项出错:', error);
      toast.error("获取待办事项出错");
    } finally {
      setIsLoading(false);
    }
  };

  // 初始加载和标签页变化时获取数据
  useEffect(() => {
    fetchTodos();
  }, [activeTab]);

  // 处理更新待办事项
  const handleUpdateTodoInternal = async (todo: TodoBO): Promise<boolean> => {
    try {
      const response = await fetch(`/api/todo/${todo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: todo }),
      });

      const result = await response.json();

      if (result.success) {
        // 更新本地状态
        setTodos(prevTodos =>
          prevTodos.map(item => item.id === todo.id ? result.data : item)
        );

        // 如果有外部处理器，也调用它
        if (onUpdateTodo) {
          await onUpdateTodo(todo);
        }

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
  };

  // 处理完成待办事项
  const handleCompleteTodoInternal = async (todoId: number): Promise<boolean> => {
    try {
      const todoToUpdate = todos.find(todo => todo.id === todoId);
      if (!todoToUpdate) return false;

      const updatedTodo = { ...todoToUpdate, status: 'completed' };

      const success = await handleUpdateTodoInternal(updatedTodo);

      // 如果有外部处理器，也调用它
      if (success && onCompleteTodo) {
        await onCompleteTodo(todoId);
      }

      return success;
    } catch (error) {
      console.error('完成待办事项出错:', error);
      toast.error("操作失败");
      return false;
    }
  };
  const handleDelete = async (todoId: number): Promise<boolean> => {
    try {
      const result = await deleteTodo(todoId)
      return result
    } catch (error) {
      console.error('删除待办事项出错:', error);
      toast.error("删除出错");
      return false;
    }
  }
  // 处理创建待办事项
  const handleCreateTodoInternal = async (todo: Partial<TodoBO>): Promise<boolean> => {
    try {
      const response = await fetch('/api/todo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            ...todo,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 刷新数据而不是直接添加，以获取服务器的完整响应
        fetchTodos();

        // 如果有外部处理器，也调用它
        if (onCreateTodo) {
          await onCreateTodo(todo);
        }

        toast.success("创建成功");
        return true;
      } else {
        toast.error("创建失败", { description: result.error });
        return false;
      }
    } catch (error) {
      console.error('创建待办事项出错:', error);
      toast.error("创建出错");
      return false;
    }
  };

  // 处理标签筛选
  const handleTagSelect = (tagId: number) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  // 处理搜索
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // 处理任务选择
  const handleTodoSelect = (todoId: number, selected: boolean) => {
    setSelectedTodos(prev =>
      selected
        ? [...prev, todoId]
        : prev.filter(id => id !== todoId)
    );
  };

  // 筛选匹配的任务
  const filteredTodos = todos.filter(todo => {
    // 搜索文本匹配
    const matchesSearch =
      !searchQuery ||
      todo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (todo.description && todo.description.toLowerCase().includes(searchQuery.toLowerCase()));

    // 标签匹配
    const matchesTags =
      selectedTags.length === 0 ||
      (todo.tagIds && todo.tagIds.some(id => selectedTags.includes(id)));

    return matchesSearch && matchesTags;
  });

  // 按优先级分组
  const groupedTodos = {
    high: filteredTodos.filter(todo => todo.priority === 'high'),
    medium: filteredTodos.filter(todo => todo.priority === 'medium'),
    low: filteredTodos.filter(todo => todo.priority === 'low' || !todo.priority),
  };

  // 获取任务对应的标签
  const getTodoTags = (todo: TodoBO) => {
    if (!todo.tagIds) return [];
    return tags.filter(tag => todo.tagIds?.includes(tag.id));
  };

  // 渲染分组的待办事项
  const renderTodoGroup = (title: string, groupTodos: TodoBO[]) => {
    if (groupTodos.length === 0) return null;

    return (
      <div className="mb-6">
        <h3 className="text-md font-medium mb-2">{title}</h3>
        <div className="space-y-2">
          {groupTodos.map(todo => (
            <TodoItem
              key={todo.id}
              todo={todo}
              tags={getTodoTags(todo)}
              selected={selectedTodos.includes(todo.id)}
              onSelect={(selected) => handleTodoSelect(todo.id, selected)}
              onUpdate={handleUpdateTodoInternal}
              onComplete={handleCompleteTodoInternal}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-4 gap-6">
      <div className="col-span-1">
        <div className="mb-6">
          <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <Plus className="mr-2 h-4 w-4" /> 新建任务
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <TodoCreationForm
                tags={tags}
                onCreateTodo={async (todo) => {
                  const result = await handleCreateTodoInternal(todo);
                  if (result) {
                    setShowCreateForm(false);
                  }
                  return result;
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        <TodoFilter
          tags={tags}
          selectedTags={selectedTags}
          searchQuery={searchQuery}
          onTagSelect={handleTagSelect}
          onSearchChange={handleSearch}
        />
      </div>

      <div className="col-span-3">
        <h2 className="text-xl font-bold mb-4">任务列表</h2>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
          <TabsList>
            <TabsTrigger value="pending">未完成</TabsTrigger>
            <TabsTrigger value="completed">已完成</TabsTrigger>
            <TabsTrigger value="archived">已取消</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-md">
            <p className="text-muted-foreground">加载中...</p>
          </div>
        ) : filteredTodos.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-md">
            <p className="text-muted-foreground">没有找到匹配的任务</p>
          </div>
        ) : (
          <div>
            {renderTodoGroup("紧急", groupedTodos.high)}
            {renderTodoGroup("中等", groupedTodos.medium)}
            {renderTodoGroup("低优先级", groupedTodos.low)}
          </div>
        )}
      </div>
    </div>
  );
}
