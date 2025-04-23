'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MultiSelect } from './multi-select';
import { TodoBO } from '@/app/api/types';

interface TodoFormProps {
  onSubmit: (
    data: Omit<TodoBO, 'id' | 'created_at' | 'updated_at' | 'completed_at'>,
    tagIds: number[]
  ) => void;
  onCancel: () => void;
  initialData?: TodoBO;
}

interface Tag {
  value: string;
  label: string;
}

export function TodoForm({ onSubmit, onCancel, initialData }: TodoFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [status, setStatus] = useState(initialData?.status || 'pending');
  const [priority, setPriority] = useState(initialData?.priority || 'medium');
  const [dueDate, setDueDate] = useState<Date | undefined>(
    initialData?.plannedDate ? new Date(initialData.plannedDate) : undefined
  );
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(true);

  // 获取所有可用标签
  useEffect(() => {
    const fetchTags = async () => {
      try {
        setIsLoadingTags(true);
        const response = await fetch('/api/todolist/tags');
        if (response.ok) {
          const tags = await response.json();
          setAvailableTags(tags.map((tag: any) => ({ 
            value: tag.id.toString(), 
            label: tag.name 
          })));
        }
      } catch (error) {
        console.error('获取标签失败:', error);
      } finally {
        setIsLoadingTags(false);
      }
    };

    fetchTags();
  }, []);

  // 获取当前todo关联的标签
  useEffect(() => {
    const fetchTodoTags = async () => {
      if (initialData) {
        try {
          setIsLoadingTags(true);
          const response = await fetch(`/api/todolist/todos/${initialData.id}`);
          if (response.ok) {
            const data = await response.json();
            if (data.tags && Array.isArray(data.tags)) {
              const todoTags = data.tags.map((tag: any) => ({ 
                value: tag.id.toString(), 
                label: tag.name 
              }));
              setSelectedTags(todoTags);
            }
          }
        } catch (error) {
          console.error('获取待办事项标签失败:', error);
        } finally {
          setIsLoadingTags(false);
        }
      }
    };

    fetchTodoTags();
  }, [initialData]);

  // 添加一个函数来处理标签值的变化
  const handleTagValueChange = (values: string[]) => {
    // 将选中的标签值转换回标签对象
    const selectedTagObjects = values.map(value => {
      const tag = availableTags.find(tag => tag.value === value);
      return tag || { value, label: value };
    });
    console.log('选择的标签对象:', selectedTagObjects);
    setSelectedTags(selectedTagObjects);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 准备提交数据
    const todoData = {
      title,
      description,
      status: status as 'pending' | 'in_progress' | 'completed' | 'archived',
      priority: priority as 'low' | 'medium' | 'high' | 'urgent',
      plannedEndTime: dueDate?.toISOString(),
      plannedDate: new Date().toISOString(),
    } as TodoBO;

    // 获取选择的标签IDs
    const tagIds = selectedTags.map(tag => parseInt(tag.value));
    
    console.log('提交的标签:', selectedTags, '标签ID:', tagIds);

    // 提交表单数据和标签ID
    onSubmit(todoData, tagIds);
  };

  // 将标签对象数组转换为值数组，用于 MultiSelect
  const selectedTagValues = selectedTags.map(tag => tag.value);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{initialData ? '编辑待办事项' : '新建待办事项'}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">标题 *</Label>
            <Input 
              id="title" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入待办事项标题"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">描述</Label>
            <Textarea 
              id="description" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="输入详细描述"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">状态</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">待处理</SelectItem>
                  <SelectItem value="in_progress">进行中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                  <SelectItem value="archived">已归档</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="priority">优先级</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="选择优先级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">低</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="high">高</SelectItem>
                  <SelectItem value="urgent">紧急</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="due-date">截止日期</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, 'PPP', { locale: zhCN }) : <span>选择日期</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                  locale={zhCN}
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tags">标签</Label>
            <MultiSelect 
              options={availableTags.map(tag => ({
                value: tag.value,
                label: tag.label,
              }))}
              defaultValue={selectedTagValues}
              onValueChange={handleTagValueChange}
              placeholder={isLoadingTags ? "加载标签中..." : "选择标签"}
              className="border-input"
            />
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button type="submit">
            {initialData ? '保存更改' : '创建待办事项'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
