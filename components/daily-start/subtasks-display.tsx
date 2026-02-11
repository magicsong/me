import { useState } from "react";
import { TodoBO } from "@/app/api/types";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon, ChevronUpIcon, CheckIcon, PencilIcon, TimerIcon, TrashIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface SubtasksDisplayProps {
  parentTodo: TodoBO;
  allTodos: TodoBO[];  // 所有的TODO列表
  onDataRefresh: () => void;
  onUpdateTodo: (todo: TodoBO) => Promise<boolean>;
  onDeleteTodo: (todoId: number) => Promise<boolean>;
  onStartPomodoro?: (todoId: number) => void;
}

export function SubtasksDisplay({
  parentTodo,
  allTodos,
  onDataRefresh,
  onUpdateTodo,
  onDeleteTodo,
  onStartPomodoro,
}: SubtasksDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(true); // 默认展开
  const [editingSubtask, setEditingSubtask] = useState<TodoBO | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<{ title: string; description?: string }>({
    title: '',
    description: '',
  });

  // 从所有TODO中筛选出属于该父任务的子任务
  const subtasks = allTodos.filter(todo => todo.parentId === parentTodo.id);

  const handleSubtaskComplete = async (subtask: TodoBO) => {
    try {
      const updated = {
        ...subtask,
        status: subtask.status === 'completed' ? 'pending' : 'completed',
        completedAt: subtask.status === 'completed' ? undefined : new Date().toISOString(),
      };
      
      const success = await onUpdateTodo(updated);
      if (success) {
        onDataRefresh();
        toast.success(`子任务已${updated.status === 'completed' ? '完成' : '取消完成'}`);
      }
    } catch (error) {
      console.error("更新子任务失败:", error);
      toast.error("更新子任务失败");
    }
  };

  const handleEditSubtask = (subtask: TodoBO) => {
    setEditingSubtask(subtask);
    setEditFormData({
      title: subtask.title,
      description: subtask.description || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveSubtask = async () => {
    if (!editingSubtask) return;

    try {
      const updated = {
        ...editingSubtask,
        title: editFormData.title,
        description: editFormData.description,
      };
      
      const success = await onUpdateTodo(updated);
      if (success) {
        onDataRefresh();
        setIsEditDialogOpen(false);
        toast.success("子任务已更新");
      }
    } catch (error) {
      console.error("保存子任务失败:", error);
      toast.error("保存子任务失败");
    }
  };

  const handleDeleteSubtask = async (subtaskId: number) => {
    if (confirm('确定要删除此子任务吗？')) {
      try {
        const success = await onDeleteTodo(subtaskId);
        if (success) {
          onDataRefresh();
          toast.success("子任务已删除");
        }
      } catch (error) {
        console.error("删除子任务失败:", error);
        toast.error("删除子任务失败");
      }
    }
  };

  const handleStartPomodoro = (subtask: TodoBO) => {
    if (onStartPomodoro) {
      onStartPomodoro(subtask.id);
    }
  };

  if (!subtasks || subtasks.length === 0) {
    return null;
  }

  return (
    <>
      <div className="ml-4 mt-2 border-l-2 border-blue-200 pl-3">
        <Button
          variant="ghost"
          size="sm"
          className="mb-2 p-0 h-auto flex items-center gap-1"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronDownIcon className="h-4 w-4 text-blue-500" />
          ) : (
            <ChevronUpIcon className="h-4 w-4 text-blue-500" />
          )}
          <span className="text-sm text-blue-600 font-medium">
            子任务 ({subtasks.filter(st => st.status !== 'completed').length}/{subtasks.length})
          </span>
        </Button>

        {isExpanded && (
          <div className="space-y-3">
            {subtasks.map(subtask => (
              <div
                key={subtask.id}
                className="flex items-center gap-3 p-3 rounded bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                {/* 完成按钮 - 仿照主任务 */}
                <Button
                  variant="custom"
                  size="sm"
                  className={`h-8 w-8 rounded-full bg-green-500 hover:bg-green-600 text-white flex-shrink-0`}
                  onClick={() => handleSubtaskComplete(subtask)}
                  disabled={false}
                  title="完成"
                >
                  <CheckIcon className="h-4 w-4" />
                </Button>

                {/* 任务信息 */}
                <div className="flex-1 min-w-0">
                  <div
                    className={`font-medium ${
                      subtask.status === 'completed'
                        ? 'line-through text-gray-500'
                        : 'text-gray-800'
                    }`}
                  >
                    {subtask.title}
                  </div>
                  {subtask.description && (
                    <div className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                      {subtask.description}
                    </div>
                  )}
                </div>

                {/* 操作按钮 - 更大更清晰 */}
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 h-8 px-3 text-blue-600 hover:text-blue-700 hover:bg-blue-100 border-blue-200"
                    onClick={() => handleEditSubtask(subtask)}
                    title="编辑"
                  >
                    <PencilIcon className="h-4 w-4" />
                    <span className="text-xs">编辑</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 h-8 px-3 text-orange-600 hover:text-orange-700 hover:bg-orange-100 border-orange-200"
                    onClick={() => handleStartPomodoro(subtask)}
                    title="番茄钟"
                  >
                    <TimerIcon className="h-4 w-4" />
                    <span className="text-xs">番茄钟</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-100 border-red-200"
                    onClick={() => handleDeleteSubtask(subtask.id)}
                    title="删除"
                  >
                    <TrashIcon className="h-4 w-4" />
                    <span className="text-xs">删除</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 编辑子任务对话框 */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>编辑子任务</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">标题</label>
              <Input
                value={editFormData.title}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                placeholder="子任务标题"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">描述</label>
              <Textarea
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder="子任务描述（可选）"
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button type="button" onClick={handleSaveSubtask}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

