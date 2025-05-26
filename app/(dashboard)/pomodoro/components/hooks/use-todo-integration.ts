import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/hooks/use-toast';
import { TodoBO } from '@/app/api/types';
import { useSearchParams } from 'next/navigation';
import { getHabitDetail } from '../../../habits/client-actions';

export function useTodoIntegration(
  setTitle: (title: string) => void,
  setDescription: (description: string) => void,
  setRelatedTodoId: (id: number | null) => void,
  setRelatedHabitId: (id: number | null) => void,
  setSourceType: (type: 'todo' | 'habit' | 'custom') => void
) {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [todos, setTodos] = useState<TodoBO[]>([]);
  const [isLoadingTodos, setIsLoadingTodos] = useState(false);
  const [isLoadingTodo, setIsLoadingTodo] = useState(false);
  const [hasUrlParams, setHasUrlParams] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // 从URL参数获取todo或habit信息
  useEffect(() => {
    if (isInitialized) {
      return;
    }
    const todoId = searchParams.get('todoId');
    const habitId = searchParams.get('habitId');

    if (todoId) {
      setHasUrlParams(true);
      setRelatedTodoId(Number(todoId));
      setRelatedHabitId(null);
      setSourceType('todo');

      // 从API获取完整的待办事项信息
      (async () => {
        const todoDetails = await fetchTodoDetails(todoId);
        if (todoDetails) {
          setTitle(todoDetails.title || '');
          if (todoDetails.description) {
            setDescription(todoDetails.description);
          }
        }
      })();
    } else if (habitId) {
      setHasUrlParams(true);
      setRelatedHabitId(Number(habitId));
      setRelatedTodoId(null);
      setSourceType('habit');
      // 从API获取完整的习惯信息
      (async () => {
        const habitDetails = await fetchHabitDetails(habitId);
        if (habitDetails) {
          setTitle(habitDetails.name || '');
          if (habitDetails.description) {
            setDescription(habitDetails.description);
          }
        }
      })();
    }
    setIsInitialized(true);
  }, [searchParams, setTitle, setDescription, setRelatedTodoId, setRelatedHabitId, setSourceType]);

  // 获取待办事项详情
  const fetchTodoDetails = useCallback(async (todoId: string) => {
    try {
      setIsLoadingTodo(true);
      const response = await fetch(`/api/todolist/todos/${todoId}`);

      if (!response.ok) {
        throw new Error('获取待办事项失败');
      }

      const todoData = await response.json();
      return todoData;
    } catch (error) {
      console.error('获取待办事项详情失败:', error);
      toast({
        title: "错误",
        description: "无法加载待办事项信息",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoadingTodo(false);
      setIsLoadingTodos(false); // 确保加载状态被重置
    }
  }, [toast]);

  // 获取待办事项列表
  const fetchTodos = useCallback(async () => {
    if (!isInitialized) {
      return;
    }
    try {
      setIsLoadingTodos(true);
      const response = await fetch('/api/todo?status=pending');

      if (!response.ok) {
        throw new Error('获取待办事项列表失败');
      }

      const resp = await response.json();
      if (!resp.success) {
        throw new Error(resp.error);
      }

      const activeTodos = resp.data.map((todo: TodoBO) => ({
        ...todo,
      }));
      setTodos(activeTodos);
    } catch (error) {
      console.error('获取待办事项列表失败:', error);
      toast({
        title: "错误",
        description: "无法加载待办事项列表",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTodos(false);
    }
  }, [isInitialized, toast]);

  // 获取习惯详情
  const fetchHabitDetails = useCallback(async (habitId: string) => {
    try {
      setIsLoadingTodo(true); // 复用加载状态
      return await getHabitDetail(Number(habitId));
    } catch (error) {
      console.error('获取习惯详情失败:', error);
      toast({
        title: "错误",
        description: "无法加载习惯信息",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoadingTodo(false);
      setIsLoadingTodos(false); // 确保加载状态被重置
    }
  }, [toast]);

  // 初始化时加载待办事项列表
  useEffect(() => {
    if (!isInitialized) {
      return;
    }
    fetchTodos();
  }, [isInitialized, fetchTodos]);

  // 处理待办事项选择
  const handleTodoSelection = useCallback((todoId: string) => {
    if (!isInitialized) {
      return;
    }
    const selectedTodo = todos.find(todo => todo.id === Number(todoId));
    if (selectedTodo && !hasUrlParams) {
      setRelatedTodoId(Number(todoId));
      setTitle(selectedTodo.title || '');
      setDescription(selectedTodo.description || '');
      setSourceType('todo');
    }
  }, [isInitialized, todos, hasUrlParams, setRelatedTodoId, setTitle, setDescription, setSourceType]);

  return {
    todos,
    isLoadingTodos,
    isLoadingTodo,
    hasUrlParams,
    isInitialized,
    fetchTodos,
    handleTodoSelection,
    fetchTodoDetails,
    fetchHabitDetails
  };
}
