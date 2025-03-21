import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { className?: string; value?: number }
>(({ className, value, ...props }, ref) => {
  // 根据进度值计算颜色
  const getColorForProgress = (progress: number): string => {
    // 将进度值映射到色相: 0% -> 0 (红色), 50% -> 60 (黄色), 100% -> 120 (绿色)
    const hue = (progress / 100) * 120;
    return `hsl(${hue}, 100%, 50%)`;
  };

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 transition-all"
        style={{ 
          transform: `translateX(-${100 - (value || 0)}%)`,
          backgroundColor: getColorForProgress(value || 0) 
        }}
      />
    </ProgressPrimitive.Root>
  );
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
