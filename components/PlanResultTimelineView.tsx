'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { X, ArrowUp, ArrowDown, Clock, Info, GripHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TimelineComponent, TimelineItem } from './timeline/timeline-component';
import { PlanBreak, PlanResult, PlanScheduleItem } from '@/app/api/todo/types';


interface PlanResultTimelineViewProps {
    planResult: PlanResult;
    date: Date;
    workingHours: { start: number; end: number };
    onSavePlan: (updatedPlan: PlanResult) => void;
    onCancel: () => void;
  }

export function PlanResultTimelineView({
  planResult,
  date,
  workingHours,
  onSavePlan,
  onCancel
}: PlanResultTimelineViewProps) {
  // 使用状态管理修改后的规划
  const [editablePlan, setEditablePlan] = useState<PlanResult>({...planResult});
  // 跟踪被移除的计划项
  const [removedItems, setRemovedItems] = useState<PlanScheduleItem[]>([]);

  // 将时间字符串（HH:MM）转换为小时数（包含小数部分表示分钟）
  const timeToHours = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + minutes / 60;
  };

  // 将小时数转换为时间字符串（HH:MM）
  const hoursToTimeStr = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // 将计划项转换为时间线项目
  const convertPlanToTimelineItems = (): TimelineItem[] => {
    const items: TimelineItem[] = [];
    
    // 添加计划的任务
    editablePlan.schedule.forEach((item, index) => {
      items.push({
        id: `task-${item.taskId}-${index}`,
        type: 'schedule',
        title: item.title,
        startTime: parseTimeString(item.startTime),
        endTime: parseTimeString(item.endTime),
        priority: 'medium',
        draggable: true,
        metadata: { ...item, index }
      });
    });
    
    // 添加休息时间
    editablePlan.breaks.forEach((breakItem, index) => {
      items.push({
        id: `break-${index}`,
        type: 'break',
        title: `${breakItem.type}`,
        startTime: parseTimeString(breakItem.startTime),
        endTime: parseTimeString(breakItem.endTime),
        priority: 'low',
        draggable: true,
        metadata: { ...breakItem, index }
      });
    });
    
    return items;
  };

  // 解析时间字符串为日期对象
  const parseTimeString = (timeStr: string): string => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const dateObj = new Date(date);
    dateObj.setHours(hours, minutes, 0, 0);
    return dateObj.toISOString();
  };

  // 处理项目拖放
  const handleItemDrop = (itemId: string | number, newStartHour: number, newEndHour: number) => {
    const itemIdStr = String(itemId);
    
    // 检查是否是计划任务
    if (itemIdStr.startsWith('task-')) {
      const taskIndex = Number(itemIdStr.split('-')[2]);
      
      // 更新计划中的任务时间
      const updatedSchedule = [...editablePlan.schedule];
      const item = updatedSchedule[taskIndex];
      
      // 更新时间
      const startTimeStr = hoursToTimeStr(newStartHour);
      const endTimeStr = hoursToTimeStr(newEndHour);
      const duration = Math.round((newEndHour - newStartHour) * 60); // 转换为分钟
      
      updatedSchedule[taskIndex] = {
        ...item,
        startTime: startTimeStr,
        endTime: endTimeStr,
        duration: duration
      };
      
      setEditablePlan(prev => ({
        ...prev,
        schedule: updatedSchedule
      }));
    }
    
    // 检查是否是休息时间
    if (itemIdStr.startsWith('break-')) {
      const breakIndex = Number(itemIdStr.split('-')[1]);
      
      // 更新休息时间
      const updatedBreaks = [...editablePlan.breaks];
      const breakItem = updatedBreaks[breakIndex];
      
      updatedBreaks[breakIndex] = {
        ...breakItem,
        startTime: hoursToTimeStr(newStartHour),
        endTime: hoursToTimeStr(newEndHour)
      };
      
      setEditablePlan(prev => ({
        ...prev,
        breaks: updatedBreaks
      }));
    }
  };

  // 从计划中移除任务
  const removeTaskFromSchedule = (taskIndex: number) => {
    const updatedSchedule = [...editablePlan.schedule];
    const removedItem = updatedSchedule[taskIndex];
    
    // 保存被移除的项目
    setRemovedItems(prev => [...prev, removedItem]);
    
    // 移除项目
    updatedSchedule.splice(taskIndex, 1);
    
    // 更新计划
    setEditablePlan(prev => ({
      ...prev,
      schedule: updatedSchedule,
      unscheduled: [
        ...prev.unscheduled,
        {
          taskId: removedItem.taskId,
          title: removedItem.title,
          reason: '用户手动移除'
        }
      ]
    }));
  };

  // 恢复被移除的任务
  const restoreRemovedTask = (index: number) => {
    const itemToRestore = removedItems[index];
    const updatedRemovedItems = [...removedItems];
    updatedRemovedItems.splice(index, 1);
    
    // 更新计划
    setEditablePlan(prev => {
      // 从未计划列表中移除
      const updatedUnscheduled = prev.unscheduled.filter(
        item => item.taskId !== itemToRestore.taskId
      );
      
      return {
        ...prev,
        schedule: [...prev.schedule, itemToRestore],
        unscheduled: updatedUnscheduled
      };
    });
    
    setRemovedItems(updatedRemovedItems);
  };

  // 保存修改后的计划
  const handleSavePlan = () => {
    onSavePlan(editablePlan);
  };

  // 渲染自定义项目内容
  const renderCustomItemContent = (item: TimelineItem) => {
    if (item.type === 'schedule') {
      const scheduleItem = item.metadata as PlanScheduleItem & { index: number };
      return (
        <div className="flex justify-between items-start w-full">
          <div className="flex-1 min-w-0">
            <div className="flex items-center">
              <GripHorizontal className="h-3 w-3 mr-1 text-muted-foreground flex-shrink-0" />
              <span className="font-medium truncate">{item.title}</span>
            </div>
            {scheduleItem.notes && (
              <div className="flex items-center mt-1 text-xs text-muted-foreground">
                <Info className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate">{scheduleItem.notes}</span>
              </div>
            )}
          </div>
          <div className="flex gap-1 flex-shrink-0 ml-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTaskFromSchedule(scheduleItem.index);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>移除规划</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      );
    }
    
    if (item.type === 'break') {
      const breakItem = item.metadata as PlanBreak;
      return (
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center">
            <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
            <span className="font-medium">{breakItem.type}</span>
          </div>
          <Badge variant="outline" className="text-xs">休息</Badge>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">AI规划结果 - {format(date, 'yyyy年MM月dd日')}</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>取消</Button>
          <Button onClick={handleSavePlan}>保存规划</Button>
        </div>
      </div>
      
      {/* 规划摘要 */}
      <div className="bg-muted p-4 rounded-lg">
        <h3 className="font-semibold mb-2">规划摘要</h3>
        <p className="text-sm text-muted-foreground">{editablePlan.summary}</p>
      </div>
      
      {/* 时间线视图 */}
      <div className="overflow-x-auto">
        <TimelineComponent
          items={convertPlanToTimelineItems()}
          workingHours={workingHours}
          date={date}
          hourHeight={100}
          showNonWorkingHours={true}
          collapsedRestHours={true}
          onItemDrop={handleItemDrop}
          renderCustomItemContent={renderCustomItemContent}
        />
      </div>
      
      {/* 未规划的任务 */}
      {editablePlan.unscheduled.length > 0 && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2 text-amber-500">未规划的任务</h3>
          <div className="space-y-2">
            {editablePlan.unscheduled.map((item, index) => (
              <div 
                key={`unscheduled-${item.taskId}-${index}`}
                className="bg-muted p-3 rounded-md flex justify-between items-center"
              >
                <div>
                  <div className="font-medium">{item.title}</div>
                  <div className="text-xs text-muted-foreground">
                    原因: {item.reason}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 被移除的任务 */}
      {removedItems.length > 0 && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-2 text-blue-500">被移除的规划</h3>
          <div className="space-y-2">
            {removedItems.map((item, index) => (
              <div 
                key={`removed-${item.taskId}-${index}`}
                className="bg-muted p-3 rounded-md flex justify-between items-center"
              >
                <div>
                  <div className="font-medium">{item.title}</div>
                  <div className="text-xs">
                    {item.startTime} - {item.endTime} ({item.duration}分钟)
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => restoreRemovedTask(index)}
                  className="text-blue-500"
                >
                  恢复
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
