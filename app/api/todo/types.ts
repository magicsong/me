import { TodoBO } from "../types/";

// 批量处理Todo请求
export interface BatchTodoRequest {
  todos: Partial<TodoBO>[];
}


export interface PlanScheduleItem {
  taskId: string;
  title: string;
  startTime: string;
  endTime: string;
  duration: number;
  notes: string;
}

export interface PlanBreak {
  startTime: string;
  endTime: string;
  type: string;
}

export interface PlanUnscheduled {
  taskId: string;
  title: string;
  reason: string;
}

export interface PlanResult {
  schedule: PlanScheduleItem[];
  breaks: PlanBreak[];
  summary: string;
  unscheduled: PlanUnscheduled[];
}