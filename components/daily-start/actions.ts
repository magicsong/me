import { PlanScheduleItem } from "@/app/api/todo/types";
import { toast } from 'sonner';

const saveSchedule = async (schedule: PlanScheduleItem[], selectedDate: Date): Promise<void> => {
    try {
      // 将规划结果转换为任务更新
      const updatePromises = schedule.map(item => {
        // 尝试转换string类型的taskId为number
        const todoId = Number(item.taskId);
        
        if (isNaN(todoId)) {
          console.warn(`无效的任务ID: ${item.taskId}`);
          return Promise.resolve();
        }
        
        // 解析时间字符串
        const parseTimeString = (timeStr: string): Date => {
          const [hours, minutes] = timeStr.split(':').map(Number);
          const date = new Date(selectedDate);
          date.setHours(hours, minutes, 0, 0);
          return date;
        };
        
        const startTime = parseTimeString(item.startTime);
        const endTime = parseTimeString(item.endTime);
        
        // 调用更新函数
        return handleUpdateTodoTime(todoId, startTime.toISOString(), endTime.toISOString());
      });
      
      await Promise.all(updatePromises.filter(Boolean));
      toast.success(`成功更新 ${schedule.length} 个任务的时间安排`);
    } catch (error) {
      console.error('保存规划结果失败:', error);
      throw new Error('更新任务时间失败');
    }
  };

  
  async function handleUpdateTodoTime(todoId: number, startTime: string, endTime: string) {
    const updatedTodo = {
      id: todoId,
      plannedStartTime: startTime,
      plannedEndTime: endTime
    };

    const response = await fetch('/api/todo/' + updatedTodo.id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: updatedTodo }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`任务 ${todoId} 时间更新成功`);
      } else {
        toast.error(`任务 ${todoId} 时间更新失败`);
      } 
      return result.data;
  }
  export { saveSchedule };