'use client';

import { Todo, TodoTag } from './todolist-container';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Edit, Trash, Clock, PlayCircle } from 'lucide-react';
import { formatDistance } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface TodoItemProps {
  todo: Todo;
  tags: TodoTag[];
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: (status: 'pending' | 'in_progress' | 'completed' | 'archived') => void;
  onStartPomodoro: () => void;
}

// 优先级映射
const priorityMap = {
  low: { label: '低', color: 'bg-slate-200 hover:bg-slate-300' },
  medium: { label: '中', color: 'bg-blue-200 hover:bg-blue-300' },
  high: { label: '高', color: 'bg-amber-200 hover:bg-amber-300' },
  urgent: { label: '紧急', color: 'bg-red-200 hover:bg-red-300' }
};

// 状态映射
const statusMap = {
  pending: { label: '待处理', color: 'bg-slate-200' },
  in_progress: { label: '进行中', color: 'bg-blue-200' },
  completed: { label: '已完成', color: 'bg-green-200' },
  archived: { label: '已归档', color: 'bg-gray-200' }
};

export function TodoItem({ todo, tags, onEdit, onDelete, onToggleStatus, onStartPomodoro }: TodoItemProps) {
  const isCompleted = todo.status === 'completed';
  const dueDate = todo.due_date ? new Date(todo.due_date) : null;
  const isOverdue = dueDate && dueDate < new Date() && !isCompleted;
  
  const handleToggle = () => {
    onToggleStatus(isCompleted ? 'pending' : 'completed');
  };

  return (
    <Card className={`border ${isCompleted ? 'bg-slate-50' : ''}`}>
      <CardHeader className="pb-2 flex flex-row items-center space-x-4">
        <Checkbox 
          checked={isCompleted}
          onCheckedChange={handleToggle}
          className="h-5 w-5"
        />
        <div className="flex-1">
          <h3 className={`text-lg font-semibold ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
            {todo.title}
          </h3>
          <div className="flex flex-wrap gap-2 mt-1">
            <Badge variant="outline" className={statusMap[todo.status].color}>
              {statusMap[todo.status].label}
            </Badge>
            <Badge variant="outline" className={priorityMap[todo.priority].color}>
              {priorityMap[todo.priority].label}优先级
            </Badge>
            {dueDate && (
              <Badge variant="outline" className={isOverdue ? 'bg-red-100' : 'bg-slate-100'}>
                <Clock className="mr-1 h-3 w-3" /> 
                {isOverdue ? '已逾期: ' : '截止日期: '}
                {formatDistance(dueDate, new Date(), { addSuffix: true, locale: zhCN })}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      {todo.description && (
        <CardContent className={`pt-2 ${isCompleted ? 'text-muted-foreground' : ''}`}>
          <p>{todo.description}</p>
        </CardContent>
      )}
      
      <CardFooter className="pt-2 flex flex-col items-start gap-2">
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map(tag => (
              <Badge key={tag.id} style={{ backgroundColor: tag.color }} className="text-xs">
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
        
        <div className="flex justify-between w-full mt-2">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onStartPomodoro}>
              <PlayCircle className="mr-1 h-4 w-4" />
              开始专注
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="text-destructive">
                  <Trash className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认删除</AlertDialogTitle>
                  <AlertDialogDescription>
                    您确定要删除此待办事项吗？此操作无法撤销。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>删除</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
