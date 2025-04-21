'use client';

import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Moon, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// 时间线项目接口定义
export interface TimelineItem {
  id: string | number;
  type: string; // 'todo', 'pomodoro', 'meeting', 'break', 等
  title: string;
  startTime: Date | string;
  endTime: Date | string;
  color?: string;
  priority?: string;
  icon?: React.ReactNode;
  draggable?: boolean;
  metadata?: any; // 额外数据
}

// 时间线组件接口定义
export interface TimelineProps {
  items: TimelineItem[];
  workingHours: { start: number; end: number };
  date: Date;
  hourHeight?: number;
  showNonWorkingHours?: boolean;
  collapsedRestHours?: boolean;
  onItemDrop?: (itemId: string | number, newStartHour: number, newEndHour: number) => void;
  onItemClick?: (item: TimelineItem) => void;
  onItemDoubleClick?: (item: TimelineItem) => void;
  renderCustomItemContent?: (item: TimelineItem) => React.ReactNode;
  renderHourDecorator?: (hour: number) => React.ReactNode;
  getItemStyle?: (item: TimelineItem) => string;
}

export function TimelineComponent({
  items,
  workingHours,
  date,
  hourHeight = 100,
  showNonWorkingHours = true,
  collapsedRestHours = true,
  onItemDrop,
  onItemClick,
  onItemDoubleClick,
  renderCustomItemContent,
  renderHourDecorator,
  getItemStyle
}: TimelineProps) {
  const [draggedItemId, setDraggedItemId] = useState<string | number | null>(null);
  const [dragStartHour, setDragStartHour] = useState<number | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // 检查时间是否在工作时间范围内
  const isWorkingHour = (hour: number) => {
    return hour >= workingHours.start && hour < workingHours.end;
  };

  // 从时间格式解析小时
  const getHourFromTime = (time: Date | string): number => {
    const date = typeof time === 'string' ? new Date(time) : time;
    return date.getHours();
  };

  // 获取项目的持续时间（小时）
  const getItemDuration = (item: TimelineItem): number => {
    const startHour = getHourFromTime(item.startTime);
    const endHour = getHourFromTime(item.endTime);
    return endHour - startHour;
  };

  // 获取特定小时的所有项目
  const getItemsForHour = (hour: number): TimelineItem[] => {
    console.log(items);
    return items.filter(item => {
      const startHour = getHourFromTime(item.startTime);
      const endHour = getHourFromTime(item.endTime);
      return startHour <= hour && endHour > hour;
    });
  };

  // 获取项目的默认样式
  const getDefaultItemStyle = (item: TimelineItem): string => {
    if (getItemStyle) {
      return getItemStyle(item);
    }
    
    // 基于类型的默认样式
    switch (item.type) {
      case 'todo':
        return cn(
          "h-[calc(100%-4px)] border rounded-md p-1 mb-1 text-sm relative",
          item.priority === 'urgent' ? 'bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-800' :
          item.priority === 'high' ? 'bg-orange-100 border-orange-300 dark:bg-orange-900/30 dark:border-orange-800' :
          item.priority === 'medium' ? 'bg-yellow-100 border-yellow-300 dark:bg-yellow-900/30 dark:border-yellow-800' :
          item.priority === 'low' ? 'bg-green-100 border-green-300 dark:bg-green-900/30 dark:border-green-800' :
          'bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-800'
        );
      case 'pomodoro':
        return "h-[calc(100%-4px)] border rounded-md p-1 mb-1 text-sm bg-red-100 border-red-300 dark:bg-red-900/30 dark:border-red-800";
      case 'meeting':
        return "h-[calc(100%-4px)] border rounded-md p-1 mb-1 text-sm bg-purple-100 border-purple-300 dark:bg-purple-900/30 dark:border-purple-800";
      case 'break':
        return "h-[calc(100%-4px)] border rounded-md p-1 mb-1 text-sm bg-teal-100 border-teal-300 dark:bg-teal-900/30 dark:border-teal-800";
      default:
        return "h-[calc(100%-4px)] border rounded-md p-1 mb-1 text-sm bg-gray-100 border-gray-300 dark:bg-gray-900/30 dark:border-gray-800";
    }
  };

  // 开始拖拽
  const handleDragStart = (itemId: string | number, hour: number) => {
    setDraggedItemId(itemId);
    setDragStartHour(hour);
  };

  // 结束拖拽
  const handleDragEnd = (endHour: number) => {
    if (draggedItemId !== null && dragStartHour !== null && onItemDrop) {
      const draggedItem = items.find(item => item.id === draggedItemId);
      if (draggedItem) {
        const itemDuration = getItemDuration(draggedItem);
        onItemDrop(draggedItemId, endHour, endHour + itemDuration);
      }
      
      // 重置拖拽状态
      setDraggedItemId(null);
      setDragStartHour(null);
    }
  };

  // 渲染休息时间动画
  const renderRestTimeAnimation = () => {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-bounce">
          <Moon className="h-6 w-6 text-indigo-400" />
        </div>
        <p className="text-muted-foreground mt-2 text-sm">休息时间</p>
      </div>
    );
  };

  // 创建24小时数组
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  // 将连续的休息时间分组
  const hourGroups: Array<{start: number, end: number, isRest: boolean}> = [];
  let currentGroup: {start: number, end: number, isRest: boolean} | null = null;
  
  hours.forEach(hour => {
    const isWorking = isWorkingHour(hour);
    
    if (!currentGroup || currentGroup.isRest !== !isWorking) {
      if (currentGroup) {
        hourGroups.push(currentGroup);
      }
      currentGroup = { start: hour, end: hour + 1, isRest: !isWorking };
    } else {
      currentGroup.end = hour + 1;
    }
  });
  
  if (currentGroup) {
    hourGroups.push(currentGroup);
  }

  return (
    <div className="relative mt-8" ref={timelineRef}>
      {hourGroups.map((group, groupIndex) => {
        // 非工作时间组
        if (group.isRest) {
          // 如果不显示非工作时间，则跳过
          if (!showNonWorkingHours) return null;
          
          // 渲染合并的休息时间块
          return (
            <div 
              key={`rest-${groupIndex}`}
              className="flex border-t border-gray-200 bg-slate-50 dark:bg-slate-900/50"
              style={{ 
                height: collapsedRestHours ? '80px' : `${hourHeight}px`
              }}
            >
              <div className="w-16 flex flex-col justify-start items-center pt-1 text-sm text-muted-foreground border-r">
                <span>{group.start}:00</span>
                <span>|</span>
                <span>{group.end}:00</span>
              </div>
              <div className="flex-1 relative">
                {renderRestTimeAnimation()}
              </div>
            </div>
          );
        } 
        // 工作时间组
        else {
          const workingHoursInGroup = Array.from(
            { length: group.end - group.start }, 
            (_, i) => group.start + i
          );
          
          return (
            <div key={`work-${groupIndex}`}>
              {workingHoursInGroup.map(hour => {
                const hourItems = getItemsForHour(hour);
                
                return (
                  <div 
                    key={hour}
                    className={cn(
                      "flex border-t border-gray-200",
                      hour % 2 === 0 ? "bg-background" : "bg-secondary/20"
                    )}
                    style={{ height: `${hourHeight}px` }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={() => draggedItemId ? handleDragEnd(hour) : null}
                  >
                    {/* 小时标识栏 */}
                    <div className="w-16 flex flex-col justify-start items-center pt-1 text-sm text-muted-foreground border-r">
                      <span>{hour}:00</span>
                      {renderHourDecorator ? renderHourDecorator(hour) : null}
                    </div>
                    
                    {/* 时间块内容区 */}
                    <div className="flex-1 relative">
                      <div className="p-1 h-full">
                        {/* 渲染项目 */}
                        {hourItems.map(item => (
                          <div 
                            key={`${item.id}-${hour}`}
                            className={cn(
                              getDefaultItemStyle(item),
                              item.draggable !== false ? "cursor-grab" : ""
                            )}
                            draggable={item.draggable !== false}
                            onDragStart={() => item.draggable !== false ? handleDragStart(item.id, hour) : null}
                            onClick={() => onItemClick ? onItemClick(item) : null}
                            onDoubleClick={() => onItemDoubleClick ? onItemDoubleClick(item) : null}
                          >
                            {renderCustomItemContent ? (
                              renderCustomItemContent(item)
                            ) : (
                              <div className="flex justify-between items-start">
                                <div className="flex items-center gap-1">
                                  {item.icon && <span>{item.icon}</span>}
                                  <span className="font-medium truncate">{item.title}</span>
                                </div>
                                {item.type === 'pomodoro' && (
                                  <Badge className="bg-red-500 text-xs">🍅</Badge>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        }
      })}
    </div>
  );
}
