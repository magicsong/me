import { CountdownCircleTimer } from 'react-countdown-circle-timer';

interface PomodoroCountdownProps {
  isRunning: boolean;
  duration: number;
  timeLeft: number;
  onComplete: () => void;
  renderTime: ({ remainingTime }: { remainingTime: number }) => JSX.Element;
}

export function PomodoroCountdown({
  isRunning,
  duration,
  timeLeft,
  onComplete,
  renderTime
}: PomodoroCountdownProps) {
  return (
    <CountdownCircleTimer
      key={isRunning ? 'running' : 'paused'} // 当状态改变时重新初始化计时器
      isPlaying={isRunning}
      duration={duration * 60}
      initialRemainingTime={timeLeft}
      colors={['#00C49F', '#F7B801', '#A30000']}
      colorsTime={[duration * 60, duration * 30, 0]}
      strokeWidth={12}
      size={220}
      trailColor="#e2e8f0"
      onComplete={() => {
        onComplete();
        return { shouldRepeat: false };
      }}
    >
      {renderTime}
    </CountdownCircleTimer>
  );
}
