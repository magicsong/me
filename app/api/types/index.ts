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
    tags: TagBO[];
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
    todoId?: number;
    habitId?: number;
    goalId?: number;
    createdAt: string;
    tagIds?: number[];
    tags?: Array<TagBO>;
}

export interface TagBO {
    id: number;
    name: string;
    color: string;
    kind?: string;
}

/**
 * 习惯业务对象类型，一般包含今日数据
 */
export interface HabitBO extends BusinessObject {
    id?: number;
    name: string;
    description?: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'scenario';
    createdAt?: string;
    userId: string;
    category?: string;
    rewardPoints: number;
    status: 'active' | 'inactive' | 'archived';
    challengeTiers?: ChallengeTierBO[];
    completedToday?: boolean;
    completedTier?: number | null;
    streak: number;
    failedToday?: boolean;
    failureReason?: string;
}

export interface ChallengeTierBO extends BusinessObject {
    id: number;
    name: string;
    level: number;
    description?: string;
    reward_points: number;
}