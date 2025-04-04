/**
 * Types for journal/diary entries that might be stored in JSONB format
 */

// String literal types for fields with specific values
export type DateType = 'yesterday' | 'today' | 'tomorrow' | 'other';
export type MoodType = '😀' | '😊' | '😐' | '😕' | '😢' | '😡' | string;
export type EnergyLevel = 'high' | 'medium' | 'low';
export type SleepQuality = 'excellent' | 'good' | 'average' | 'poor' | 'terrible';

// Type for completed tasks
export interface Task {
    id: string;
    title: string;
    completed: boolean;
    description?: string;
}

// Main journal entry type
export interface JournalEntry {
    date: string; // Format: 'YYYY-MM-DD'
    mood: MoodType;
    dateType: DateType;
    learnings: string[]; // 修改为数组类型
    challenges: string[]; // 修改为数组类型
    goodThings: string[];
    energyLevel: EnergyLevel;
    improvements: string[]; // 修改为数组类型
    sleepQuality: SleepQuality;
    tomorrowGoals: string;
    completedTasks: string[];
    failedTasks: string[]; // 添加字段
    completionCount: number;
    completionScore: number;
    summary?: string; // 添加字段
}

// Helper type for partial journal entries
export type PartialJournalEntry = Partial<JournalEntry>;