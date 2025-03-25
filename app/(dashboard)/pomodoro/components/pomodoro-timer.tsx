'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, RotateCcw, Check } from 'lucide-react';
import { updatePomodoroStatus } from '@/lib/db/pomodoro';

// 预设时间选项（分钟）
const PRESET_DURATIONS = [5, 10, 15, 20, 25, 30, 45, 60];

// 定义类型
interface PomodoroTimerProps {
  activePomodoro: any;
  playSoundOnComplete: boolean;
  onPomodoroChange: (pomodoro: any) => void;
}

export function PomodoroTimer({
  activePomodoro,
  playSoundOnComplete = true,
  onPomodoroChange
}: PomodoroTimerProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(25);
  const [customDuration, setCustomDuration] = useState('25'); // 设置默认值
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isFinished, setIsFinished] = useState(false); // 新增状态：计时结束但未确认完成
  const [selectedTag, setSelectedTag] = useState('');
  const [tags, setTags] = useState<any[]>([]);
  const [pomodoroId, setPomodoroId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 初始化音频
  useEffect(() => {
    try {
      audioRef.current = new Audio('/sounds/complete.mp3');
      // 预加载音频
      audioRef.current.load();
    } catch (error) {
      console.error('初始化音频失败:', error);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

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

  // 恢复活动中的番茄钟
  useEffect(() => {
    if (activePomodoro) {
      console.log("恢复番茄钟状态:", activePomodoro);
      const endTime = activePomodoro.startTime + activePomodoro.duration * 1000*60;
      setTitle(activePomodoro.title || '');
      setDescription(activePomodoro.description || '');
      setDuration(activePomodoro.duration || 25);
      setCustomDuration((activePomodoro.duration || 25).toString());
      const remainingTime = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setTimeLeft(remainingTime);
      setIsRunning(remainingTime > 0);
      setIsFinished(remainingTime === 0);
      setSelectedTag(activePomodoro.tagId || '');
      if (activePomodoro.id) {
        setPomodoroId(activePomodoro.id);
      }
    }
  }, [activePomodoro]);

  // 处理计时器
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          const newTime = prevTime - 1;
          if (newTime <= 0) {
            // 修改：计时结束时不自动完成
            setIsRunning(false);
            setIsFinished(true); // 设置为已结束状态
            
            // 播放提示音但不完成番茄钟
            if (playSoundOnComplete && audioRef.current) {
              try {
                const playPromise = audioRef.current.play();
                if (playPromise !== undefined) {
                  playPromise.catch(error => {
                    console.error('播放完成提示音失败:', error);
                  });
                }
              } catch (error) {
                console.error('播放完成提示音失败:', error);
              }
            }
            
            return 0;
          }
          return newTime;
        });
      }, 1000);
    } else if (!isRunning && timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, timeLeft, playSoundOnComplete]);

  // 更新服务器端番茄钟状态
  const updateServerPomodoroStatus = useCallback(async (id: number, status: 'running' | 'completed' | 'canceled' | 'paused') => {
    if (!id) return;

    try {
      // 使用pomodoro.ts中的函数来更新状态，而不是直接调用API
      const updatedPomodoro = await fetch(`/api/pomodoro/${id}/status`, {
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

  // 番茄钟完成处理
  const completePomodoro = useCallback(async () => {
    console.log("番茄钟完成");
    setIsRunning(false);
    setIsCompleted(true);
    setIsFinished(false); // 重置结束状态，确保不会同时显示多个按钮

    if (playSoundOnComplete && audioRef.current) {
      try {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error('播放完成提示音失败:', error);
          });
        }
      } catch (error) {
        console.error('播放完成提示音失败:', error);
      }
    }

    // 如果有现有的番茄钟ID，更新其状态
    if (pomodoroId) {
      await updateServerPomodoroStatus(pomodoroId, 'completed');
      setPomodoroId(null);
    } else {
      // 否则创建新番茄钟记录
      try {
        const response = await fetch('/api/pomodoro', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title,
            description,
            duration,
            tagIds: selectedTag ? [selectedTag] : []
          }),
        });

        if (response.ok) {
          console.log("保存番茄钟成功");
          toast({
            title: "番茄钟完成",
            description: "您的专注时间已保存",
          });
        } else {
          const errorData = await response.json();
          throw new Error(`请求失败: ${errorData.error || response.statusText}`);
        }
      } catch (error) {
        console.error('保存番茄钟失败:', error);
        toast({
          title: "错误",
          description: "保存专注记录失败",
          variant: "destructive",
        });
      }
    }

    // 通知状态改变
    onPomodoroChange(null);
  }, [pomodoroId, title, description, duration, selectedTag, updateServerPomodoroStatus, playSoundOnComplete, toast]);

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
      const endTime = startTime + durationInSeconds * 1000;

      // 先创建服务器端番茄钟
      try {
        const response = await fetch('/api/pomodoro', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title,
            description,
            duration: durationInMinutes,
            tagIds: selectedTag ? [selectedTag] : []
          }),
        });

        if (response.ok) {
          const newPomodoro = await response.json();
          setPomodoroId(newPomodoro.id);

          // 设置本地状态
          setTimeLeft(durationInSeconds);
          setIsRunning(true);
          setIsCompleted(false);

          // 通知父组件状态改变
          onPomodoroChange({
            id: newPomodoro.id,
            title,
            description,
            duration: durationInMinutes,
            tagId: selectedTag,
            startTime,
            endTime,
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
  }, [title, description, duration, selectedTag, onPomodoroChange, toast]);

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
    setIsFinished(false); // 重置结束状态

    // 如果有关联的番茄钟ID，更新其状态为取消
    if (pomodoroId) {
      await updateServerPomodoroStatus(pomodoroId, 'canceled');
      setPomodoroId(null);
    }

    // 通知父组件状态改变
    onPomodoroChange(null);
  }, [duration, pomodoroId, onPomodoroChange, updateServerPomodoroStatus]);

  // 处理自定义时长变化
  const handleCustomDurationChange = useCallback((value: string) => {
    setCustomDuration(value);
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue > 0) {
      setDuration(numValue);
    }
  }, []);

  // 格式化时间显示（mm:ss）
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return (
    <div className="space-y-6">
      {!isRunning && !isCompleted && !isFinished && (
        <div className="grid gap-4">
          <div>
            <Label htmlFor="title">标题</Label>
            <Input
              id="title"
              placeholder="输入番茄钟标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isRunning}
            />
          </div>

          <div>
            <Label htmlFor="description">描述（可选）</Label>
            <Textarea
              id="description"
              placeholder="输入描述..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isRunning}
            />
          </div>

          <div>
            <Label htmlFor="duration">时长（分钟）</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_DURATIONS.map((preset) => (
                <Button
                  key={preset}
                  variant={duration === preset ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setDuration(preset);
                    setCustomDuration(preset.toString());
                  }}
                  disabled={isRunning}
                  type="button"
                >
                  {preset}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                id="duration"
                type="number"
                min="1"
                placeholder="自定义时长"
                value={customDuration}
                onChange={(e) => handleCustomDurationChange(e.target.value)}
                disabled={isRunning}
                className="w-full"
              />
            </div>
          </div>

          {tags.length > 0 && (
            <div>
              <Label htmlFor="tag">标签（可选）</Label>
              <Select
                value={selectedTag}
                onValueChange={setSelectedTag}
                disabled={isRunning}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择标签" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">无标签</SelectItem>
                  {tags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>
                      {tag.name}
                    </SelectItem>  // 正确闭合标签
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col items-center">
        <div className={`text-6xl font-bold mb-6 ${isRunning ? 'rounded-full border-4 border-gray-300 p-6' : ''}`}>
          {formatTime(timeLeft)}
        </div>

        <div className="flex gap-4">
          {!isRunning && !isCompleted && !isFinished && (
            <Button
              size="lg"
              onClick={startPomodoro}
              type="button"
            >
              <Play className="mr-2" /> 开始专注
            </Button>
          )}

          {isRunning && (
            <Button
              size="lg"
              onClick={togglePause}
              variant="outline"
              type="button"
            >
              <Pause className="mr-2" /> {isRunning ? '暂停' : '继续'}
            </Button>
          )}

          {isFinished && !isCompleted && (
            <Button
              size="lg"
              onClick={completePomodoro}
              variant="default"
              type="button"
            >
              <Check className="mr-2" /> 确认完成
            </Button>
          )}

          {(isRunning || timeLeft > 0 || isFinished) && !isCompleted && (
            <Button
              size="lg"
              onClick={resetPomodoro}
              variant="outline"
              type="button"
            >
              <RotateCcw className="mr-2" /> 重置
            </Button>
          )}

          {isCompleted && (
            <Button
              size="lg"
              onClick={resetPomodoro}
              variant="default"
              type="button"
            >
              <Check className="mr-2" /> 完成！开始新的番茄钟
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}