import { useToast } from '@/components/hooks/use-toast';
import { PomodoroBO, TodoBO } from '@/app/api/types';
import { useEffect, useRef, useState } from 'react';

export interface PomodoroState {
  title: string;
  description: string;
  duration: number;
  customDuration: string;
  timeLeft: number;
  isRunning: boolean;
  isCompleted: boolean;
  isFinished: boolean;
  selectedTag: string;
  pomodoroId: number | null;
  relatedTodoId: number | null;
  relatedHabitId: number | null;
  sourceType: 'todo' | 'habit' | 'custom';
  isTodoCompleted: boolean;
}

export interface PomodoroStateActions {
  setTitle: (title: string) => void;
  setDescription: (description: string) => void;
  setDuration: (duration: number) => void;
  setCustomDuration: (customDuration: string) => void;
  setTimeLeft: (timeLeft: number | ((prev: number) => number)) => void;
  setIsRunning: (isRunning: boolean) => void;
  setIsCompleted: (isCompleted: boolean) => void;
  setIsFinished: (isFinished: boolean) => void;
  setSelectedTag: (tag: string) => void;
  setPomodoroId: (id: number | null) => void;
  setRelatedTodoId: (id: number | null) => void;
  setRelatedHabitId: (id: number | null) => void;
  setSourceType: (type: 'todo' | 'habit' | 'custom') => void;
  setIsTodoCompleted: (completed: boolean) => void;
}

export function usePomodoroState(
  activePomodoro?: PomodoroBO | null
): [PomodoroState, PomodoroStateActions] {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(25);
  const [customDuration, setCustomDuration] = useState('25');
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [selectedTag, setSelectedTag] = useState('');
  const [pomodoroId, setPomodoroId] = useState<number | null>(null);
  const [relatedTodoId, setRelatedTodoId] = useState<number | null>(null);
  const [relatedHabitId, setRelatedHabitId] = useState<number | null>(null);
  const [sourceType, setSourceType] = useState<'todo' | 'habit' | 'custom'>('custom');
  const [isTodoCompleted, setIsTodoCompleted] = useState(false);
  
  // 恢复活动中的番茄钟
  useEffect(() => {
    if (activePomodoro) {
      const endTime = new Date(activePomodoro.startTime).getTime() + activePomodoro.duration * 1000 * 60;
      setTitle(activePomodoro.title || '');
      setDescription(activePomodoro.description || '');
      setDuration(activePomodoro.duration || 25);
      setCustomDuration((activePomodoro.duration || 25).toString());
      const remainingTime = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setTimeLeft(remainingTime);
      setIsRunning(remainingTime > 0);
      setIsFinished(remainingTime === 0);
      if (activePomodoro.id) {
        setPomodoroId(activePomodoro.id);
      }
      if (activePomodoro.todoId) {
        setRelatedTodoId(activePomodoro.todoId);
        setSourceType('todo');
      }
      if (activePomodoro.habitId) {
        setRelatedHabitId(activePomodoro.habitId);
        setSourceType('habit');
      }
    }
  }, [activePomodoro]);

  const state: PomodoroState = {
    title,
    description,
    duration,
    customDuration,
    timeLeft,
    isRunning,
    isCompleted,
    isFinished,
    selectedTag,
    pomodoroId,
    relatedTodoId,
    relatedHabitId,
    sourceType,
    isTodoCompleted,
  };

  const actions: PomodoroStateActions = {
    setTitle,
    setDescription,
    setDuration,
    setCustomDuration,
    setTimeLeft,
    setIsRunning,
    setIsCompleted,
    setIsFinished,
    setSelectedTag,
    setPomodoroId,
    setRelatedTodoId,
    setRelatedHabitId,
    setSourceType,
    setIsTodoCompleted,
  };

  return [state, actions];
}
