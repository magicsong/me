import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  CheckIcon,
  EditIcon,
  TrashIcon,
  FlagIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";

interface TaskItem {
  id?: string;
  title: string;
  description?: string;
  priority?: 'urgent' | 'high' | 'medium' | 'low';
  editing?: boolean;
  expanded?: boolean;
}

interface TaskSuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generatedTasks: {
    created: TaskItem[];
    updated: TaskItem[];
  };
  onSave: () => Promise<void>;
  onEdit: (index: number, isUpdated: boolean, field: keyof TaskItem, value: any) => void;
  onRemove: (index: number, isUpdated: boolean) => void;
  onToggleEditing: (index: number, isUpdated: boolean) => void;
  onSuccess?: () => void; // 新增：保存成功后的回调
}

export function TaskSuggestionDialog({
  open,
  onOpenChange,
  generatedTasks,
  onSave,
  onEdit,
  onRemove,
  onToggleEditing,
  onSuccess
}: TaskSuggestionDialogProps) {
  
  const handleSave = async () => {
    try {
      await onSave();
      // 如果提供了成功回调，则调用它
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("保存任务失败:", error);
      toast.error("保存任务失败，请重试");
    }
  };

  const toggleExpanded = (index: number, isUpdated: boolean) => {
    onEdit(index, isUpdated, 'expanded', !getTaskExpanded(index, isUpdated));
  };

  const getTaskExpanded = (index: number, isUpdated: boolean): boolean => {
    return isUpdated 
      ? !!generatedTasks.updated[index]?.expanded 
      : !!generatedTasks.created[index]?.expanded;
  };

  const getPriorityColor = (priority?: string) => {
    switch(priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      case 'medium': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getPriorityLabel = (priority?: string) => {
    switch(priority) {
      case 'urgent': return '紧急';
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return '普通';
    }
  };

  const getTaskIcon = (priority?: string) => {
    switch(priority) {
      case 'urgent': return <FlagIcon className="h-3 w-3 mr-1 text-red-600" />;
      case 'high': return <FlagIcon className="h-3 w-3 mr-1 text-orange-500" />;
      case 'medium': return <FlagIcon className="h-3 w-3 mr-1 text-blue-500" />;
      case 'low': return <FlagIcon className="h-3 w-3 mr-1 text-green-500" />;
      default: return <FlagIcon className="h-3 w-3 mr-1 text-gray-400" />;
    }
  };

  const priorityOptions = [
    { value: 'urgent', label: '紧急', color: 'text-red-600' },
    { value: 'high', label: '高', color: 'text-orange-500' },
    { value: 'medium', label: '中', color: 'text-blue-500' },
    { value: 'low', label: '低', color: 'text-green-500' }
  ];

  const renderTask = (task: TaskItem, index: number, isUpdated: boolean) => {
    const isExpanded = getTaskExpanded(index, isUpdated);

    if (task.editing) {
      return (
        <Card key={`${isUpdated ? 'update' : 'new'}-${index}`} className="overflow-hidden">
          <CardContent className="p-4 space-y-3">
            <div className="font-medium text-sm mb-1">标题</div>
            <Input 
              value={task.title} 
              onChange={(e) => onEdit(index, isUpdated, 'title', e.target.value)}
              className="mb-2"
              placeholder="任务标题"
            />
            
            <div className="font-medium text-sm mb-1">描述</div>
            <Textarea
              value={task.description || ''}
              onChange={(e) => onEdit(index, isUpdated, 'description', e.target.value)}
              placeholder="任务描述（可选）"
              className="min-h-[80px] mb-2"
            />
            
            <div className="flex items-center justify-between">
              <div className="space-x-2">
                <span className="text-sm font-medium">优先级:</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 px-2">
                      {getTaskIcon(task.priority)}
                      {getPriorityLabel(task.priority)}
                      <ChevronDownIcon className="ml-1 h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {priorityOptions.map(option => (
                      <DropdownMenuItem 
                        key={option.value}
                        className={option.color}
                        onClick={() => onEdit(index, isUpdated, 'priority', option.value)}
                      >
                        <FlagIcon className="mr-2 h-4 w-4" />
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="space-x-1">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => onToggleEditing(index, isUpdated)}
                  className="h-8 w-8"
                >
                  <CheckIcon className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => onRemove(index, isUpdated)}
                  className="h-8 w-8"
                >
                  <TrashIcon className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <motion.div
        key={`${isUpdated ? 'update' : 'new'}-${index}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: index * 0.05 }}
      >
        <Card className={isUpdated ? "border-l-4 border-l-blue-400" : ""}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div 
                className="flex-1 font-medium"
                onClick={() => toggleExpanded(index, isUpdated)}
              >
                <div className="flex items-center cursor-pointer">
                  {isUpdated && <Badge variant="outline" className="mr-2 text-xs">更新</Badge>}
                  <span>{task.title}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-1 ml-2">
                <Badge variant="secondary" className={`${getPriorityColor(task.priority)} text-xs`}>
                  {getTaskIcon(task.priority)}
                  {getPriorityLabel(task.priority)}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => toggleExpanded(index, isUpdated)}
                >
                  {isExpanded ? 
                    <ChevronUpIcon className="h-4 w-4" /> : 
                    <ChevronDownIcon className="h-4 w-4" />
                  }
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => onToggleEditing(index, isUpdated)}
                  className="h-7 w-7"
                >
                  <EditIcon className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => onRemove(index, isUpdated)}
                  className="h-7 w-7"
                >
                  <TrashIcon className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
            
            {isExpanded && task.description && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 pt-2 border-t text-sm text-muted-foreground"
              >
                {task.description}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg md:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <span className="text-gradient bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">
              AI生成的任务建议
            </span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 max-h-[60vh] overflow-y-auto py-2 pr-2">
          {generatedTasks.created.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center border-b pb-2">
                <span className="bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                  新建任务
                </span>
                <Badge className="ml-2">{generatedTasks.created.length}</Badge>
              </h4>
              <div className="space-y-3">
                {generatedTasks.created.map((task, index) => renderTask(task, index, false))}
              </div>
            </div>
          )}
          
          {generatedTasks.updated.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center border-b pb-2">
                <span className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                  更新任务
                </span>
                <Badge className="ml-2">{generatedTasks.updated.length}</Badge>
              </h4>
              <div className="space-y-3">
                {generatedTasks.updated.map((task, index) => renderTask(task, index, true))}
              </div>
            </div>
          )}
          
          {generatedTasks.created.length === 0 && generatedTasks.updated.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <div className="mx-auto w-16 h-16 mb-4 rounded-full bg-secondary flex items-center justify-center">
                <FlagIcon className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="font-medium">没有生成任何任务建议</p>
              <p className="text-sm mt-1">请尝试调整您的意图描述后重新生成</p>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex items-center justify-between sm:justify-end gap-2 pt-2 border-t">
          <div className="text-sm text-muted-foreground sm:mr-auto">
            {generatedTasks.created.length + generatedTasks.updated.length > 0 && 
              `共 ${generatedTasks.created.length + generatedTasks.updated.length} 个任务`
            }
          </div>
          <DialogClose asChild>
            <Button variant="outline">取消</Button>
          </DialogClose>
          <Button 
            onClick={handleSave}
            disabled={generatedTasks.created.length + generatedTasks.updated.length === 0}
          >
            确认添加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
