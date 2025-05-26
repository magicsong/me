'use client';

import { useToast } from '@/components/hooks/use-toast';
import { useEffect, useRef, useState, useCallback } from 'react';
import { BaseRequest } from '@/app/api/lib/types';
import { PomodoroBO } from '@/app/api/types';
import { usePomodoroState } from './hooks/use-pomodoro-state';
import { usePomodoroTimer } from './hooks/use-pomodoro-timer';
import { useTodoIntegration } from './hooks/use-todo-integration';
import { PomodoroForm } from './ui/pomodoro-form';
import { PomodoroCountdown } from './ui/pomodoro-countdown';
import { PomodoroControls } from './ui/pomodoro-controls';
import { set } from 'date-fns';

// 定义类型
interface PomodoroTimerProps {
  activePomodoro: PomodoroBO;
  playSoundOnComplete: boolean;
  onPomodoroChange: (pomodoro: PomodoroBO) => void;
}

export function PomodoroTimer({
  activePomodoro,
  playSoundOnComplete = true,
  onPomodoroChange
}: PomodoroTimerProps) {
  const { toast } = useToast();
  const [state, actions] = usePomodoroState(activePomodoro);
  const { 
    title, description, duration, customDuration,
    timeLeft, isRunning, isCompleted, isFinished,
    selectedTag, pomodoroId, relatedTodoId, relatedHabitId,
    sourceType, isTodoCompleted 
  } = state;
  
  const { 
    setTitle, setDescription, setDuration, setCustomDuration,
    setTimeLeft, setIsRunning, setIsCompleted, setIsFinished,
    setSelectedTag, setPomodoroId, setRelatedTodoId, setRelatedHabitId,
    setSourceType, setIsTodoCompleted 
  } = actions;
  
  const [tags, setTags] = useState<any[]>([]);
  
  // 定时器和音频相关逻辑
  const { playSound, formatTime } = usePomodoroTimer(state, actions, playSoundOnComplete);
  
  // 待办事项集成
  const { 
    todos, isLoadingTodos, isLoadingTodo, 
    fetchTodos, handleTodoSelection
  } = useTodoIntegration(
    setTitle, 
    setDescription, 
    setRelatedTodoId,
    setRelatedHabitId,
    setSourceType
  );
  
  // 加载标签
  useEffect(() => {
    try {
      const savedTags = localStorage.getItem('pomodoroTags');
      if (savedTags) {
        setTags(JSON.parse(savedTags));
      }
    } catch (error) {
      console.error('加载标签失败:', error);
    }
  }, []);
  
  // 更新服务器端番茄钟状态
  const updateServerPomodoroStatus = useCallback(async (id: number, status: 'running' | 'completed' | 'canceled' | 'paused') => {
    if (!id) return;

    try {
      const updatedPomodoro = await fetch(`/api/pomodoro/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      return updatedPomodoro.ok;
    } catch (error) {
      console.error(`更新番茄钟状态失败 (${status}):`, error);
      return false;
    }
  }, []);

  // 添加一个新函数，用于完成待办事项
  const completeTodoAndPomodoro = useCallback(async () => {
    // 首先完成番茄钟
    setIsRunning(false);
    setIsCompleted(true);
    setIsFinished(false);

    try {
      // 如果有关联的番茄钟ID，更新其状态
      if (pomodoroId) {
        const response = await fetch(`/api/pomodoro/${pomodoroId}/complete`, {
          method: 'POST',
        });

        if (response.ok) {
          setPomodoroId(null);
        } else {
          throw new Error('更新番茄钟状态失败');
        }
      }

      // 如果有关联的待办事项ID，将其标记为完成
      if (relatedTodoId) {
        const todoResponse = await fetch(`/api/todo/${relatedTodoId}/complete`, {
          method: 'POST',
        });

        if (!todoResponse.ok) {
          throw new Error('完成待办事项失败');
        }
        setIsTodoCompleted(true);
        toast({
          title: "成功",
          description: "已完成番茄钟和关联的待办事项",
        });
        // 完成后刷新待办事项列表
        await fetchTodos();
        setRelatedTodoId(null); // 清除关联的待办事项ID
      }
    } catch (error) {
      console.error('完成番茄钟和待办事项失败:', error);
      toast({
        title: "错误",
        description: "更新状态失败",
        variant: "destructive",
      });
    }

    // 通知状态改变
    onPomodoroChange(null);
  }, [pomodoroId, relatedTodoId, toast, fetchTodos, onPomodoroChange]);

  // 番茄钟完成处理
  const completePomodoro = useCallback(async () => {
    setIsRunning(false);
    setIsCompleted(true);
    setIsFinished(false);

    // 播放音效
    playSound();

    // 如果有现有的番茄钟ID，更新其状态
    if (pomodoroId) {
      try {
        const response = await fetch(`/api/pomodoro/${pomodoroId}/complete`, {
          method: 'POST',
        });

        if (response.ok) {
          setPomodoroId(null);
          setRelatedTodoId(null); // 清除关联的待办事项ID
        } else {
          throw new Error('请求失败');
        }
      } catch (error) {
        console.error('完成番茄钟失败:', error);
      }
    }
    // 通知状态改变
    onPomodoroChange(null);
  }, [pomodoroId, onPomodoroChange, playSound]);

  // 开始番茄钟
  const startPomodoro = useCallback(async () => {
    try {
      console.log("尝试开始番茄钟:", { title, duration });

      if (!title.trim()) {
        console.log("标题为空");
        toast({
          title: "错误",
          description: "请输入番茄钟标题",
          variant: "destructive",
        });
        return;
      }

      const durationInMinutes = Number(duration);
      if (isNaN(durationInMinutes) || durationInMinutes <= 0) {
        console.log("时长无效:", duration);
        toast({
          title: "错误",
          description: "请输入有效的时长",
          variant: "destructive",
        });
        return;
      }

      const durationInSeconds = durationInMinutes * 60;
      const startTime = Date.now();
      const request = {} as BaseRequest<Partial<PomodoroBO>>;
      request.data = {
        title,
        description,
        duration: durationInMinutes,
        tagIds: selectedTag ? [Number(selectedTag)] : [],
        todoId: relatedTodoId ? relatedTodoId : undefined,
        habitId: relatedHabitId ? relatedHabitId : undefined
      }

      // 先创建服务器端番茄钟
      try {
        const response = await fetch('/api/pomodoro', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        });

        if (response.ok) {
          const newPomodoro = await response.json();
          setPomodoroId(newPomodoro.id);

          // 设置本地状态
          setTimeLeft(durationInSeconds);
          setIsRunning(true);
          setIsCompleted(false);
          setIsTodoCompleted(false);

          // 通知父组件状态改变
          onPomodoroChange({
            id: newPomodoro.id,
            title,
            description,
            duration: durationInMinutes,
            tagId: selectedTag,
            todoId: relatedTodoId,
            startTime,
            endTime: startTime + durationInSeconds * 1000,
          });

          toast({
            title: "番茄钟开始",
            description: `${durationInMinutes} 分钟的专注时间已开始`,
          });

          console.log("番茄钟成功启动");
        } else {
          const errorData = await response.json();
          throw new Error(`创建番茄钟失败: ${errorData.error || response.statusText}`);
        }
      } catch (error) {
        console.error("创建番茄钟失败:", error);
        toast({
          title: "错误",
          description: "创建番茄钟失败",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("启动番茄钟出错:", error);
      toast({
        title: "错误",
        description: "启动番茄钟时发生错误",
        variant: "destructive",
      });
    }
  }, [title, description, duration, selectedTag, relatedTodoId, relatedHabitId, onPomodoroChange, toast]);

  // 暂停/继续番茄钟
  const togglePause = useCallback(async () => {
    console.log(`${isRunning ? '暂停' : '继续'}番茄钟`);
    const newIsRunning = !isRunning;
    setIsRunning(newIsRunning);

    // 如果有关联的番茄钟ID，更新其状态
    if (pomodoroId) {
      await updateServerPomodoroStatus(pomodoroId, newIsRunning ? 'running' : 'paused');
    }
  }, [isRunning, pomodoroId, updateServerPomodoroStatus]);

  // 重置番茄钟
  const resetPomodoro = useCallback(async () => {
    console.log("重置番茄钟");
    setIsRunning(false);
    setTimeLeft(duration * 60);
    setIsCompleted(false);
    setIsFinished(false);
    setIsTodoCompleted(false);

    // 如果有关联的番茄钟ID，更新其状态为取消
    if (pomodoroId) {
      await updateServerPomodoroStatus(pomodoroId, 'canceled');
      setPomodoroId(null);
    }

    // 通知父组件状态改变
    onPomodoroChange(null);
  }, [duration, pomodoroId, onPomodoroChange, updateServerPomodoroStatus]);
  
  // 再次开始同样的番茄钟
  const restartSamePomodoro = useCallback(async () => {
    setIsRunning(true);
    setIsCompleted(false);
    setIsFinished(false);
    setPomodoroId(null);
    // 立即开始新的番茄钟
    try {
      const durationInMinutes = Number(duration);
      const durationInSeconds = durationInMinutes * 60;
      setTimeLeft(durationInSeconds);
      const startTime = Date.now();
      const request = {} as BaseRequest<Partial<PomodoroBO>>;
      request.data = {
        title,
        description,
        duration: durationInMinutes,
        tagIds: selectedTag ? [Number(selectedTag)] : [],
        todoId: relatedTodoId ? relatedTodoId : undefined,
        habitId: relatedHabitId ? relatedHabitId : undefined
      }

      const response = await fetch('/api/pomodoro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (response.ok) {
        const newPomodoro = await response.json();
        setPomodoroId(newPomodoro.data?.id);

        // 设置本地状态
        setTimeLeft(durationInSeconds);
        setIsRunning(true);
        setIsCompleted(false);
        setIsTodoCompleted(false);

        // 通知父组件状态改变
        onPomodoroChange(newPomodoro.data);

        toast({
          title: "番茄钟开始",
          description: `${durationInMinutes} 分钟的专注时间已开始`,
        });
      } else {
        const errorData = await response.json();
        throw new Error(`创建番茄钟失败: ${errorData.error || response.statusText}`);
      }
    } catch (error) {
      console.error("重新开始番茄钟失败:", error);
      toast({
        title: "错误",
        description: "重新开始番茄钟失败",
        variant: "destructive",
      });
    }
  }, [title, description, duration, selectedTag, relatedTodoId, relatedHabitId, onPomodoroChange, toast]);

  // 渲染倒计时的时间显示
  const renderTime = useCallback(({ remainingTime }: { remainingTime: number }) => {
    if (remainingTime === 0) {
      return <div className="text-3xl font-bold">00:00</div>;
    }

    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;

    return (
      <div className="text-center">
        <div className="text-3xl font-bold">
          {`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`}
        </div>
        <div className="text-sm mt-1">
          {isRunning ? "正在专注" : "已暂停"}
        </div>
      </div>
    );
  }, [isRunning]);
  
  const handleTimerComplete = useCallback(() => {
    setIsRunning(false);
    setIsFinished(true);
  }, []);

  return (
    <div className="space-y-6">
      {!isRunning && !isCompleted && !isFinished && (
        <PomodoroForm
          state={state}
          actions={actions}
          todos={todos}
          isLoadingTodos={isLoadingTodos}
          isLoadingTodo={isLoadingTodo}
          handleTodoSelection={handleTodoSelection}
          tags={tags}
        />
      )}

      <div className="flex flex-col items-center">
        {/* 添加在番茄钟运行时显示标题和描述 */}
        {(isRunning || isFinished) && !isCompleted && (
          <div className="mb-4 text-center">
            <h3 className="text-xl font-semibold">{title}</h3>
            {description && (
              <p className="mt-2 text-muted-foreground whitespace-pre-line">{description}</p>
            )}
          </div>
        )}

        <div className="mb-6">
          {(isRunning || isFinished || timeLeft > 0) && (
            <PomodoroCountdown
              isRunning={isRunning}
              duration={duration}
              timeLeft={timeLeft}
              onComplete={handleTimerComplete}
              renderTime={renderTime}
            />
          )}
          {!isRunning && !isFinished && timeLeft === 0 && !isCompleted && (
            <div className="text-6xl font-bold mb-6">
              {formatTime(duration * 60)}
            </div>
          )}
          {isCompleted && (
            <div className="text-6xl font-bold mb-6 text-green-500">
              完成!
            </div>
          )}
        </div>

        <PomodoroControls
          isRunning={isRunning}
          isCompleted={isCompleted}
          isFinished={isFinished}
          isTodoCompleted={isTodoCompleted}
          sourceType={sourceType}
          onStart={startPomodoro}
          onTogglePause={togglePause}
          onComplete={completePomodoro}
          onCompleteTodoAndPomodoro={completeTodoAndPomodoro}
          onReset={resetPomodoro}
          onRestartSame={restartSamePomodoro}
        />
      </div>
    </div>
  );
}