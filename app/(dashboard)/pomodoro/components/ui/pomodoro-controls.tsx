import { Button } from '@/components/ui/button';
import { Check, Pause, Play } from 'lucide-react';

interface PomodoroControlsProps {
  isRunning: boolean;
  isCompleted: boolean;
  isFinished: boolean;
  isTodoCompleted: boolean;
  sourceType: 'todo' | 'habit' | 'custom';
  onStart: () => void;
  onTogglePause: () => void;
  onComplete: () => void;
  onCompleteTodoAndPomodoro: () => void;
  onReset: () => void;
  onRestartSame: () => void;
}

export function PomodoroControls({
  isRunning,
  isCompleted,
  isFinished,
  isTodoCompleted,
  sourceType,
  onStart,
  onTogglePause,
  onComplete,
  onCompleteTodoAndPomodoro,
  onReset,
  onRestartSame
}: PomodoroControlsProps) {
  return (
    <div className="flex gap-4">
      {!isRunning && !isCompleted && !isFinished && (
        <Button
          size="lg"
          onClick={onStart}
          type="button"
        >
          <Play className="mr-2" /> 开始专注
        </Button>
      )}

      {isRunning && (
        <Button
          size="lg"
          onClick={onTogglePause}
          variant="outline"
          type="button"
        >
          <Pause className="mr-2" /> 暂停
        </Button>
      )}

      {isFinished && !isCompleted && (
        <div className="flex gap-3 w-full">
          <Button
            size="lg"
            onClick={onComplete}
            variant="default"
            type="button"
            className="flex-1"
          >
            <Check className="mr-2" /> 确认完成
          </Button>

          {sourceType === 'todo' && (
            <Button
              size="lg"
              onClick={onCompleteTodoAndPomodoro}
              variant="default"
              type="button"
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Check className="mr-2" /> 完成待办
            </Button>
          )}
        </div>
      )}
      
      {isCompleted && (
        <div className="flex gap-3 w-full">
          <Button
            size="lg"
            onClick={onReset}
            variant="outline"
            type="button"
            className="flex-1"
          >
            <Check className="mr-2" /> 完成！开始新的番茄钟
          </Button>
          {!isTodoCompleted && (
            <Button
              size="lg"
              onClick={onRestartSame}
              variant="default"
              type="button"
              className="flex-1"
            >
              <Play className="mr-2" /> 再次开始同样的番茄钟
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
