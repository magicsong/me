import { Badge } from "@/components/ui/badge";
import { Circle, AlertTriangle, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TodoPriorityProps {
  priority: string;
  showLabel?: boolean;
}

export function TodoPriority({ priority, showLabel = true }: TodoPriorityProps) {
  let icon = null;
  let label = "";
  let colorClass = "";
  
  switch (priority) {
    case "urgent":
      icon = <AlertTriangle className="h-3 w-3" />;
      label = "紧急";
      colorClass = "text-red-500 bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800";
      break;
    case "high":
      icon = <ArrowUp className="h-3 w-3" />;
      label = "重要";
      colorClass = "text-orange-500 bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800";
      break;
    case "medium":
      icon = <Circle className="h-3 w-3" />;
      label = "普通";
      colorClass = "text-blue-500 bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800";
      break;
    case "low":
      icon = <ArrowDown className="h-3 w-3" />;
      label = "低优先级";
      colorClass = "text-green-500 bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800";
      break;
    default:
      icon = <Circle className="h-3 w-3" />;
      label = "未分类";
      colorClass = "text-gray-500 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700";
  }
  
  return (
    <Badge 
      variant="outline"
      className={cn("flex items-center gap-1 py-0.5 px-2", colorClass)}
    >
      {icon}
      {showLabel && <span>{label}</span>}
    </Badge>
  );
}
