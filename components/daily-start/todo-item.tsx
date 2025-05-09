import React, { useState } from 'react';
import { TodoBO } from "@/app/api/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { CheckIcon, TrashIcon, PencilIcon, TimerIcon, TagIcon, PlusIcon, XIcon, BrainIcon, Loader2 } from "lucide-react";
import { TodoPriority } from "./todo-priority";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useRouter } from 'next/navigation';
import { pl } from 'date-fns/locale';

interface TodoItemProps {
  todo: TodoBO;
  tags?: Array<{ id: number; name: string; color: string }>;
  allTags?: Array<{ id: number; name: string; color: string }>;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onUpdate: (todo: TodoBO) => Promise<boolean>;
  onComplete?: (todoId: number) => Promise<boolean>;
  onDelete: (todoId: number) => Promise<boolean>;
  onUpdateTags: (todoId: number, tagIds: number[]) => Promise<boolean>;
  onStartPomodoro?: (todoId: number) => void;
  onCreateTag: (name: string, color: string) => Promise<{ id: number; name: string; color: string }>;
  onCreateSubTasks?: (todoId: number, subTasks: Array<{ title: string, description?: string }>) => Promise<boolean>;
}

export function TodoItem({
  todo,
  tags,
  allTags = [],
  selected,
  onSelect,
  onUpdate,
  onComplete,
  onDelete,
  onUpdateTags,
  onStartPomodoro,
  onCreateTag,
  onCreateSubTasks
}: TodoItemProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTagsOpen, setIsTagsOpen] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(todo.tagIds || []);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6"); // 默认蓝色
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [isAiSplitOpen, setIsAiSplitOpen] = useState(false);
  const [isGeneratingSubTasks, setIsGeneratingSubTasks] = useState(false);
  const [generatedSubTasks, setGeneratedSubTasks] = useState<Array<{ title: string, description?: string }>>([]);
  const router = useRouter();
  const form = useForm<Partial<TodoBO>>({
    defaultValues: {
      id: todo.id,
      title: todo.title,
      description: todo.description || '',
      status: todo.status,
      priority: todo.priority,
      plannedDate: todo.plannedDate,
      plannedStartTime: todo.plannedStartTime,
      plannedEndTime: todo.plannedEndTime,
    },
  });

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onComplete || isCompleting) return;

    setIsCompleting(true);
    try {
      await onComplete(todo.id);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('确定要删除此任务吗？')) {
      await onDelete(todo.id);
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditOpen(true);
  };

  const handleSubmitEdit = async (data: Partial<TodoBO>) => {
    await onUpdate({
      ...todo,
      ...data
    });
    setIsEditOpen(false);
  };

  const handleStartPomodoro = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // 如果任务状态为 pending，先将其更新为 in_progress
    if (todo.status === 'pending') {
      try {
        // 创建更新对象，只更新状态字段
        const updatedTodo = {
          ...todo,
          status: 'in_progress',
        };
        if (!updatedTodo.plannedStartTime) {
          updatedTodo.plannedStartTime = new Date().toISOString();
        }
        // 调用更新函数
        await onUpdate(updatedTodo);
      } catch (error) {
        console.error('更新任务状态失败:', error);
        // 即使状态更新失败，仍然继续启动番茄钟
      }
    }
    if (onStartPomodoro) {
      await onStartPomodoro(todo.id);
    } else {
      router.push(`/pomodoro?todoId=${todo.id}`);
    }
  };

  const handleTagsEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTagIds(todo.tagIds || []);
    setIsTagsOpen(true);
  };

  const handleTagsSubmit = async () => {
    try {
      // 获取当前标签和选中标签的差集
      const currentTagIds = todo.tagIds || [];
      const tagsToAdd = selectedTagIds.filter(id => !currentTagIds.includes(id));
      const tagsToRemove = currentTagIds.filter(id => !selectedTagIds.includes(id));

      // 如果有要添加的标签，调用添加API
      if (tagsToAdd.length > 0) {
        const response = await fetch(`/api/todo/${todo.id}/tags`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tagIds: tagsToAdd }),
        });

        if (!response.ok) {
          throw new Error('添加标签失败');
        }
      }

      // 如果有要移除的标签，调用删除API
      if (tagsToRemove.length > 0) {
        const queryParams = new URLSearchParams({
          tagIds: tagsToRemove.join(',')
        }).toString();

        const response = await fetch(`/api/todo/${todo.id}/tags?${queryParams}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('移除标签失败');
        }
      }

      // 如果外部提供了回调函数，也调用它
      if (onUpdateTags) {
        await onUpdateTags(todo.id, selectedTagIds);
      }

      setIsTagsOpen(false);
    } catch (error) {
      console.error('更新标签失败:', error);
      alert('更新标签时出错，请重试');
    }
  };

  const toggleTag = (tagId: number) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleCreateTag = async () => {
    if (!onCreateTag || !newTagName.trim()) return;

    setIsCreatingTag(true);
    try {
      const newTag = await onCreateTag(newTagName.trim(), newTagColor);
      setSelectedTagIds(prev => [...prev, newTag.id]);
      setNewTagName("");
    } catch (error) {
      console.error("创建标签失败", error);
    } finally {
      setIsCreatingTag(false);
    }
  };

  const handleAiSplit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAiSplitOpen(true);
  };

  const generateSubTasks = async () => {
    setIsGeneratingSubTasks(true);
    try {
      const response = await fetch(`/api/ai/split-task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: todo.title,
          description: todo.description,
        }),
      });

      if (!response.ok) {
        throw new Error('AI拆分任务失败');
      }

      const data = await response.json();
      setGeneratedSubTasks(data.subTasks || []);
    } catch (error) {
      console.error('AI拆分任务失败:', error);
      alert('AI拆分任务失败，请重试');
    } finally {
      setIsGeneratingSubTasks(false);
    }
  };

  const handleSaveSubTasks = async () => {
    if (onCreateSubTasks && generatedSubTasks.length > 0) {
      try {
        await onCreateSubTasks(todo.id, generatedSubTasks);
        setIsAiSplitOpen(false);
        setGeneratedSubTasks([]);
      } catch (error) {
        console.error('保存子任务失败:', error);
        alert('保存子任务失败，请重试');
      }
    }
  };

  const handleEditSubTask = (index: number, field: 'title' | 'description', value: string) => {
    const newSubTasks = [...generatedSubTasks];
    if (field === 'title') {
      newSubTasks[index].title = value;
    } else {
      newSubTasks[index].description = value;
    }
    setGeneratedSubTasks(newSubTasks);
  };

  const handleRemoveSubTask = (index: number) => {
    setGeneratedSubTasks(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      <div
        id={`todo-item-${todo.id}`}
        className={`
          flex items-center p-2 rounded-md border border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all
          ${todo.status === 'completed' ? 'bg-green-50 dark:bg-green-900/20 line-through text-gray-500' : ''}
          ${isCompleting ? 'todo-completing' : ''}
        `}
      >
        <Checkbox
          checked={selected}
          onCheckedChange={onSelect}
          className="mr-3"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <TodoPriority priority={todo.priority} showLabel={false} />
            <span className="font-medium truncate">{todo.title}</span>

            {/* 显示番茄钟计数 */}
            {todo.pomodoroCount && todo.pomodoroCount > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                <TimerIcon className="h-3 w-3" />
                <span>{todo.pomodoroCount}个番茄钟</span>
              </Badge>
            )}
          </div>

          {todo.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{todo.description}</p>
          )}

          {tags && tags.length > 0 && (
            <div className="flex flex-wrap mt-2 gap-1">
              {tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="text-xs py-0"
                  style={{ backgroundColor: `${tag.color}20`, borderColor: tag.color }}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 ml-2">
          <Button
            variant="custom"
            size="sm"
            className={`h-8 w-8 rounded-full bg-green-500 hover:bg-green-600 text-white ${isCompleting ? 'animate-spin' : ''}`}
            onClick={handleComplete}
            disabled={isCompleting || todo.status === 'completed'}
            title="完成"
          >
            <CheckIcon className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 h-8"
            onClick={handleEdit}
          >
            <PencilIcon className="h-4 w-4" />
            <span>编辑</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 h-8"
            onClick={handleTagsEdit}
          >
            <TagIcon className="h-4 w-4" />
            <span>标签</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 h-8"
            onClick={handleStartPomodoro}
          >
            <TimerIcon className="h-4 w-4" />
            <span>番茄钟</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 h-8"
            onClick={handleAiSplit}
            title="AI拆分任务"
          >
            <BrainIcon className="h-4 w-4" />
            <span>AI拆分</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 h-8 text-red-500 hover:text-red-600"
            onClick={handleDelete}
          >
            <TrashIcon className="h-4 w-4" />
            <span>删除</span>
          </Button>
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>编辑任务</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmitEdit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>标题</FormLabel>
                    <FormControl>
                      <Input placeholder="任务标题" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>描述</FormLabel>
                    <FormControl>
                      <Textarea placeholder="任务描述" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>状态</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择状态" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">待办</SelectItem>
                          <SelectItem value="in_progress">进行中</SelectItem>
                          <SelectItem value="completed">已完成</SelectItem>
                          <SelectItem value="archived">已归档</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>优先级</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择优先级" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="urgent">紧急</SelectItem>
                          <SelectItem value="high">高</SelectItem>
                          <SelectItem value="medium">中</SelectItem>
                          <SelectItem value="low">低</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="plannedDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>计划日期</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value), "PPP")
                            ) : (
                              <span>选择日期</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : undefined)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="plannedStartTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>开始时间</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="plannedEndTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>结束时间</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  取消
                </Button>
                <Button type="submit">保存更改</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isTagsOpen} onOpenChange={setIsTagsOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>管理标签</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 my-4">
              {allTags.length === 0 ? (
                <div className="w-full text-center py-4 text-muted-foreground">
                  暂无标签，请先创建标签
                </div>
              ) : (
                allTags.map(tag => (
                  <Badge
                    key={tag.id}
                    variant={selectedTagIds.includes(tag.id) ? "default" : "outline"}
                    className="cursor-pointer text-sm py-1 px-2"
                    style={{
                      backgroundColor: selectedTagIds.includes(tag.id) ? tag.color : 'transparent',
                      borderColor: tag.color,
                      color: selectedTagIds.includes(tag.id) ? '#fff' : 'inherit'
                    }}
                    onClick={() => toggleTag(tag.id)}
                  >
                    {tag.name}
                    {selectedTagIds.includes(tag.id) && (
                      <XIcon className="h-3 w-3 ml-1" />
                    )}
                  </Badge>
                ))
              )}
            </div>

            {onCreateTag && (
              <div className="border p-3 rounded-md space-y-3">
                <h4 className="text-sm font-medium">添加新标签</h4>
                <div className="flex items-center gap-2">
                  <Input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="标签名称"
                    className="flex-1"
                  />
                  <Input
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="w-14 p-1 h-10"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateTag}
                    disabled={!newTagName.trim() || isCreatingTag}
                  >
                    {isCreatingTag ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        添加中
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <PlusIcon className="h-4 w-4 mr-1" />
                        添加
                      </span>
                    )}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs">预览：</div>
                  <Badge
                    variant="default"
                    className="text-sm py-1 px-2"
                    style={{
                      backgroundColor: newTagColor,
                      borderColor: newTagColor,
                    }}
                  >
                    {newTagName || '标签预览'}
                  </Badge>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsTagsOpen(false)}>
                取消
              </Button>
              <Button type="button" onClick={handleTagsSubmit}>
                保存标签
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAiSplitOpen} onOpenChange={setIsAiSplitOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI拆分任务</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-muted p-3 rounded-md">
              <h3 className="font-medium">原任务:</h3>
              <p className="font-medium">{todo.title}</p>
              {todo.description && (
                <p className="text-sm text-muted-foreground">{todo.description}</p>
              )}
            </div>

            {!generatedSubTasks.length && !isGeneratingSubTasks && (
              <Button
                onClick={generateSubTasks}
                className="w-full flex items-center justify-center gap-2"
              >
                <BrainIcon className="h-4 w-4" />
                <span>开始AI任务拆分</span>
              </Button>
            )}

            {isGeneratingSubTasks && (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-2">AI正在为您拆分任务...</p>
              </div>
            )}

            {generatedSubTasks.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-medium">拆分后的子任务:</h3>
                {generatedSubTasks.map((subTask, index) => (
                  <div key={index} className="border rounded-md p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Input
                          value={subTask.title}
                          onChange={(e) => handleEditSubTask(index, 'title', e.target.value)}
                          className="font-medium"
                          placeholder="子任务标题"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSubTask(index)}
                        className="text-red-500"
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      value={subTask.description || ''}
                      onChange={(e) => handleEditSubTask(index, 'description', e.target.value)}
                      placeholder="子任务描述（可选）"
                      className="text-sm"
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAiSplitOpen(false)}>
              取消
            </Button>
            <Button
              type="button"
              disabled={generatedSubTasks.length === 0}
              onClick={handleSaveSubTasks}
            >
              保存子任务
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
