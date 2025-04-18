'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Todo, TodoTag } from './todolist-container';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// 生成的待办事项类型
interface GeneratedTodo {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'archived';
  estimatedDuration: number;
  suggestedTags: string[];
  selected?: boolean; // 用户是否选择此待办事项
  editing?: boolean; // 是否正在编辑此待办事项
}

interface TodoAutoPlanProps {
  onCreateTodos: (todos: Omit<Todo, 'id' | 'created_at' | 'updated_at' | 'completed_at'>[], tagNames: string[][]) => Promise<void>;
  onCancel: () => void;
  availableTags: TodoTag[];
}

export function TodoAutoPlan({ onCreateTodos, onCancel, availableTags }: TodoAutoPlanProps) {
  const [taskDescription, setTaskDescription] = useState('');
  const [generatedTodos, setGeneratedTodos] = useState<GeneratedTodo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 生成待办事项计划
  const generatePlan = async () => {
    if (!taskDescription.trim()) {
      setError('请输入任务描述');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/todolist/auto-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: taskDescription }),
      });
      
      if (!response.ok) {
        throw new Error('生成计划失败');
      }
      
      const data = await response.json();
      
      // 为每个生成的待办事项添加selected和editing标记
      const todos = data.todoItems.map((todo: GeneratedTodo) => ({
        ...todo,
        selected: true,
        editing: false,
      }));
      console.log('[debug]生成的待办事项:', todos);
      setGeneratedTodos(todos);
    } catch (err) {
      setError('生成待办事项计划失败，请重试');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 切换选择状态
  const toggleSelect = (index: number) => {
    setGeneratedTodos(todos => todos.map((todo, i) => 
      i === index ? { ...todo, selected: !todo.selected } : todo
    ));
  };
  
  // 切换编辑状态
  const toggleEdit = (index: number) => {
    setGeneratedTodos(todos => todos.map((todo, i) => 
      i === index ? { ...todo, editing: !todo.editing } : todo
    ));
  };
  
  // 更新待办事项内容
  const updateTodo = (index: number, field: keyof GeneratedTodo, value: any) => {
    setGeneratedTodos(todos => todos.map((todo, i) => 
      i === index ? { ...todo, [field]: value } : todo
    ));
  };
  
  // 删除待办事项
  const deleteTodo = (index: number) => {
    setGeneratedTodos(todos => todos.filter((_, i) => i !== index));
  };
  
  // 创建所有选中的待办事项
  const createSelectedTodos = async () => {
    const selectedTodos = generatedTodos.filter(todo => todo.selected);
    if (selectedTodos.length === 0) {
      setError('请至少选择一个待办事项');
      return;
    }
    
    // 从生成的待办事项中提取需要的字段，准备创建
    const todosToCreate = selectedTodos.map(({ title, description, status, priority }) => ({
      title,
      description,
      status,
      priority,
    }));
    
    // 提取标签名称数组
    const tagNamesArray = selectedTodos.map(todo => todo.suggestedTags || []);
    
    await onCreateTodos(todosToCreate, tagNamesArray);
  };
  
  // 全选/全不选
  const selectAll = (selected: boolean) => {
    setGeneratedTodos(todos => todos.map(todo => ({ ...todo, selected })));
  };
  
  // 获取优先级对应的颜色和标签
  const getPriorityInfo = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return { color: 'bg-red-500 text-white', label: '紧急' };
      case 'high':
        return { color: 'bg-orange-500 text-white', label: '高' };
      case 'medium':
        return { color: 'bg-blue-500 text-white', label: '中' };
      case 'low':
        return { color: 'bg-green-500 text-white', label: '低' };
      default:
        return { color: 'bg-gray-500 text-white', label: '未知' };
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          AI自动规划待办事项
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!generatedTodos.length ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="task-description">描述您的任务或目标</Label>
              <Textarea
                id="task-description"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="例如：我需要开发一个在线商城网站，包括产品展示、购物车和支付功能"
                className="mt-1.5 resize-none"
                rows={5}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                AI 已为您生成了 {generatedTodos.length} 个待办事项
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => selectAll(true)}
                >
                  全选
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => selectAll(false)}
                >
                  全不选
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              {generatedTodos.map((todo, index) => (
                <Card key={index} className={cn("overflow-hidden", !todo.selected && "opacity-60")}>
                  <div className="flex items-center p-3 bg-muted/30">
                    <Checkbox
                      checked={todo.selected}
                      onCheckedChange={() => toggleSelect(index)}
                      className="mr-3"
                    />
                    
                    {todo.editing ? (
                      <Textarea
                        value={todo.title}
                        onChange={(e) => updateTodo(index, 'title', e.target.value)}
                        className="flex-1 h-8 py-1"
                      />
                    ) : (
                      <span className="font-medium flex-1">{todo.title}</span>
                    )}
                    
                    <div className="flex items-center gap-2 ml-2">
                      <Badge className={getPriorityInfo(todo.priority).color}>
                        {getPriorityInfo(todo.priority).label}
                      </Badge>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleEdit(index)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTodo(index)}
                        className="h-8 w-8 p-0 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {todo.editing ? (
                    <div className="p-3">
                      <Textarea
                        value={todo.description}
                        onChange={(e) => updateTodo(index, 'description', e.target.value)}
                        className="w-full mb-2"
                        rows={2}
                      />
                      
                      <div className="flex flex-wrap gap-2 mt-2">
                        {todo.suggestedTags.map((tag, tagIndex) => (
                          <Badge key={tagIndex} variant="outline" className="bg-primary/10">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : todo.selected && (
                    <div className="p-3">
                      <p className="text-sm text-muted-foreground">{todo.description}</p>
                      
                      <div className="flex flex-wrap gap-2 mt-2">
                        {todo.suggestedTags.map((tag, tagIndex) => (
                          <Badge key={tagIndex} variant="outline" className="bg-primary/10">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          取消
        </Button>
        
        {!generatedTodos.length ? (
          <Button onClick={generatePlan} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 生成中...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> 生成待办事项
              </>
            )}
          </Button>
        ) : (
          <Button onClick={createSelectedTodos} disabled={generatedTodos.filter(t => t.selected).length === 0}>
            创建 {generatedTodos.filter(t => t.selected).length} 项待办事项
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
