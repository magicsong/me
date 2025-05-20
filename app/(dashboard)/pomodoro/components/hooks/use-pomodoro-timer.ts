import { useEffect, useRef } from 'react';
import { useToast } from '@/components/hooks/use-toast';
import { PomodoroState, PomodoroStateActions } from './use-pomodoro-state';

export function usePomodoroTimer(
  state: PomodoroState, 
  actions: PomodoroStateActions,
  playSoundOnComplete: boolean = true
) {
  const { timeLeft, isRunning, isFinished } = state;
  const { setTimeLeft, setIsRunning, setIsFinished } = actions;
  const { toast } = useToast();
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // 初始化音频
  useEffect(() => {
    try {
      audioRef.current = new Audio('/sounds/complete.mp3');
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
  
  // 处理计时器
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          const newTime = prevTime - 1;
          if (newTime <= 0) {
            setIsRunning(false);
            setIsFinished(true);

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
  }, [isRunning, timeLeft, playSoundOnComplete, setTimeLeft, setIsRunning, setIsFinished]);

  // 播放提示音的方法
  const playSound = () => {
    if (playSoundOnComplete && audioRef.current) {
      try {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error('播放提示音失败:', error);
          });
        }
      } catch (error) {
        console.error('播放提示音失败:', error);
      }
    }
  };

  // 格式化时间显示
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    playSound,
    formatTime,
    audioRef
  };
}
