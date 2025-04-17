import { BusinessObject } from '../lib/types';

// Todo 业务对象
export interface TodoBO extends BusinessObject {
    id: number;
    userId: string;
    title: string;
    description?: string;
    status: 'pending' | 'in_progress' | 'completed' | 'archived';
    priority: 'urgent' | 'high' | 'medium' | 'low';
    plannedDate?: string;
    plannedStartTime?: string;
    plannedEndTime?: string;
    completedAt?: string;
    createdAt: string;
    updatedAt: string;
    tagIds?: number[];
    tags: { id: number; name: string; color: string }[];
}

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

export interface PomodoroBO extends BusinessObject {
    id: number;
    userId: string;
    title: string;
    description?: string;
    duration: number;
    status: 'running' | 'completed' | 'canceled' | 'paused';
    startTime: string;
    endTime?: string;
    habitId?: number;
    goalId?: number;
    createdAt: string;
    tags?: Array<{
      id: number;
      name: string;
      color: string;
    }>;
  }

