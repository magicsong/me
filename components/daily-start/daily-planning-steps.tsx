import { TodoBO } from "@/app/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  ClockIcon,
  GridIcon,
  RefreshCwIcon,
  SparklesIcon,
  SunIcon,
} from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { QuadrantPlanner } from "./quadrant-planner";
import { TaskSuggestionDialog } from "./task-suggestion-dialog";
import { LoadingModal } from "../ui/loading-modal";

interface DailyPlanningStepsProps {
  onStartFocusing: () => void;
  todos: TodoBO[]; // 添加todos属性
  onUpdateTodo: (todo: TodoBO) => Promise<boolean>; // 添加更新todo的方法
  onDataRefresh: () => void; // 修改为数据刷新回调
}

export function DailyPlanningSteps({
  onStartFocusing,
  todos,
  onUpdateTodo,
  onDataRefresh
}: DailyPlanningStepsProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isCompleted, setIsCompleted] = useState(false);
  const [intention, setIntention] = useState("");
  const [updateExisting, setUpdateExisting] = useState(false);
  // 保留时间安排相关状态
  const [timeSchedule, setTimeSchedule] = useState("");
  // 任务建议弹窗状态
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [generatedTasksData, setGeneratedTasksData] = useState<{
    created: Array<{ id?: string, title: string, description?: string, priority?: 'urgent' | 'high' | 'medium' | 'low', editing?: boolean, expanded?: boolean }>;
    updated: Array<{ id: string, title: string, description?: string, priority?: 'urgent' | 'high' | 'medium' | 'low', editing?: boolean, expanded?: boolean }>;
  }>({ created: [], updated: [] });

  // 添加loading状态
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isTimeGenerating, setIsTimeGenerating] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  // 检查本地存储是否已经完成了今天的规划
  React.useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const completedDate = localStorage.getItem("planningCompletedDate");
    if (completedDate === today) {
      setIsCompleted(true);
    }
  }, []);

  // 添加一键迁移昨日未完成任务的函数
  const migrateYesterdayTasks = async () => {
    try {
      setIsMigrating(true);

      // 获取昨天的日期
      const yesterday = new Date();
      yesterday.setHours(0);
      yesterday.setMinutes(0);
      const yesterdayStr = yesterday.toUTCString();
      // 获取昨天未完成的任务
      const response = await fetch(`/api/todo?plannedDate_lt=${yesterdayStr}&status_ne=completed`);

      if (!response.ok) {
        throw new Error('获取昨日任务失败');
      }

      const data = await response.json();
      const yesterdayTasks = data.success && data.data ? data.data : [];

      if (yesterdayTasks.length === 0) {
        toast.info('没有找到昨日未完成的任务');
        return;
      }
      // 获取今天的日期
      const today = new Date().toUTCString();

      // 更新所有任务的计划日期为今天
      const updatePromises = yesterdayTasks.map(async (task: TodoBO) => {
        if (task.completedAt) {
          console.log("task is already done",task);
          return
        }
        const updateResponse = await fetch(`/api/todo/${task.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...task,
            plannedDate: today
          }),
        });

        if (!updateResponse.ok) {
          throw new Error(`更新任务 ${task.id} 失败`);
        }

        return updateResponse.json();
      });

      await Promise.all(updatePromises);

      // 刷新数据
      onDataRefresh();
      toast.success(`成功迁移 ${yesterdayTasks.length} 个未完成任务到今天`);
      setCurrentStep(2);
    } catch (error) {
      console.error('迁移任务失败:', error);
      toast.error('迁移任务失败，请重试');
    } finally {
      setIsMigrating(false);
    }
  };

  const steps = [
    { id: 1, title: "迁移昨日TODO", icon: <ClipboardListIcon className="h-4 w-4" /> },
    { id: 2, title: "今日规划", icon: <SunIcon className="h-4 w-4" /> },
    { id: 3, title: "四象限规划", icon: <GridIcon className="h-4 w-4" /> },
    { id: 4, title: "时间安排", icon: <ClockIcon className="h-4 w-4" /> }
  ];

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
      onDataRefresh();
    } else {
      completePlanning();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completePlanning = () => {
    // 保存所有规划数据
    localStorage.setItem("dailyIntention", intention);
    localStorage.setItem("planningCompletedDate", new Date().toISOString().split('T')[0]);
    setIsCompleted(true);
    toast.success("每日规划已完成！");
  };

  const resetPlanning = () => {
    setIsCompleted(false);
    setCurrentStep(1);
  };

  const simulateAiGeneration = async () => {
    // 检查intention是否为空
    if (!intention.trim()) {
      toast.error("请先填写今日规划后再生成任务");
      return;
    }
    setIsAiGenerating(true);
    // 如果需要更新现有待办，先获取今天的待办事项
    let existingTodos = [];
    if (updateExisting) {
      try {
        // 获取今天的日期
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`/api/todo?plannedDate_gte=${today}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            existingTodos = Array.isArray(data.data) ? data.data : [];
          }
        }
      } catch (error) {
        console.error("获取现有待办事项失败:", error);
        // 继续执行，但不包含现有待办
      }
    }

    // 调用真实的API生成TODO列表
    try {
      setIsAiGenerating(true);
      const response = await fetch('/api/todo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isAIGeneration: true,
          isBatch: true,
          userPrompt: intention,
          batchSize: 4,
          generateBothCreatedAndUpdated: updateExisting,
          data: existingTodos
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`请求失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'AI生成失败');
      }

      // 为每个任务添加默认的优先级
      const created = data.data.created?.map((todo: any) => ({
        ...todo,
        priority: todo.priority || 'medium',  // 默认中等优先级
        expanded: false
      })) || [];

      const updated = data.data.updated?.map((todo: any) => ({
        ...todo,
        priority: todo.priority || 'medium',  // 默认中等优先级
        expanded: false
      })) || [];

      // 存储完整的任务数据用于弹窗展示
      setGeneratedTasksData({
        created,
        updated
      });

      // 打开弹窗
      setShowTaskDialog(true);

      const newTasksCount = data.data.created?.length || 0;
      const updatedTasksCount = data.data.updated?.length || 0;

      toast.success(`成功生成${newTasksCount}个新任务${updatedTasksCount > 0 ? `，更新${updatedTasksCount}个任务` : ''}!`);
    } catch (error) {
      console.error('AI任务生成错误:', error);
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        toast.error('网络连接错误，请检查您的网络');
      } else if (error instanceof SyntaxError) {
        toast.error('解析服务器响应失败');
      } else {
        toast.error(`生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    } finally {
      setIsAiGenerating(false);
    }
  };

  // 处理创建/更新任务的函数
  const handleSaveTasks = async () => {
    const tasksToCreate = generatedTasksData.created.map(task => ({
      title: task.title,
      description: task.description,
      priority: task.priority
    }));

    const tasksToUpdate = generatedTasksData.updated.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority
    }));

    // 发送创建/更新请求
    try {
      // 创建新任务
      if (tasksToCreate.length > 0) {
        const createResponse = await fetch('/api/todo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            isBatch: true,
            data: tasksToCreate
          }),
        });

        if (!createResponse.ok) {
          throw new Error('创建任务失败');
        }
      }

      // 更新现有任务
      if (tasksToUpdate.length > 0) {
        for (const task of tasksToUpdate) {
          const updateResponse = await fetch(`/api/todo/${task.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: task.id,
              title: task.title,
              description: task.description,
              priority: task.priority
            }),
          });

          if (!updateResponse.ok) {
            throw new Error(`更新任务 ${task.id} 失败`);
          }
        }
      }

      toast.success(`已成功添加${tasksToCreate.length}个任务${tasksToUpdate.length > 0 ? `并更新${tasksToUpdate.length}个任务` : ''}`);
      setShowTaskDialog(false);
    } catch (error) {
      console.error("保存任务失败:", error);
      toast.error("保存任务失败，请重试");
    }
  };

  // 编辑任务字段
  const handleEditTask = (index: number, isUpdated: boolean, field: string, value: any) => {
    if (isUpdated) {
      const updatedTasks = [...generatedTasksData.updated];
      updatedTasks[index] = { ...updatedTasks[index], [field]: value };
      setGeneratedTasksData({ ...generatedTasksData, updated: updatedTasks });
    } else {
      const createdTasks = [...generatedTasksData.created];
      createdTasks[index] = { ...createdTasks[index], [field]: value };
      setGeneratedTasksData({ ...generatedTasksData, created: createdTasks });
    }
  };

  // 删除任务
  const handleRemoveTask = (index: number, isUpdated: boolean) => {
    if (isUpdated) {
      const updatedTasks = generatedTasksData.updated.filter((_, i) => i !== index);
      setGeneratedTasksData({ ...generatedTasksData, updated: updatedTasks });
    } else {
      const createdTasks = generatedTasksData.created.filter((_, i) => i !== index);
      setGeneratedTasksData({ ...generatedTasksData, created: createdTasks });
    }
  };

  // 切换编辑状态
  const toggleEditing = (index: number, isUpdated: boolean) => {
    if (isUpdated) {
      const updatedTasks = [...generatedTasksData.updated];
      updatedTasks[index].editing = !updatedTasks[index].editing;
      setGeneratedTasksData({ ...generatedTasksData, updated: updatedTasks });
    } else {
      const createdTasks = [...generatedTasksData.created];
      createdTasks[index].editing = !createdTasks[index].editing;
      setGeneratedTasksData({ ...generatedTasksData, created: createdTasks });
    }
  };

  const generateTimeSchedule = () => {
    // 模拟AI生成时间表
    toast.promise(
      new Promise(resolve => setTimeout(resolve, 1500)),
      {
        loading: '正在规划您的时间表...',
        success: () => {
          setTimeSchedule(
            "09:00 - 10:30 专注工作：完成项目A开发\n" +
            "10:30 - 11:00 休息\n" +
            "11:00 - 12:00 回复邮件\n" +
            "12:00 - 13:00 午餐休息\n" +
            "13:00 - 15:00 准备会议材料\n" +
            "15:00 - 15:30 休息\n" +
            "15:30 - 17:00 代码审核\n" +
            "17:00 - 17:30 日总结"
          );
          return "时间表已生成!";
        },
        error: "生成失败，请重试"
      }
    );
  };

  if (isCompleted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SunIcon className="h-5 w-5 text-yellow-500" />
              今日规划已完成
            </div>
            <Button variant="outline" size="sm" onClick={resetPlanning}>
              <RefreshCwIcon className="h-4 w-4 mr-2" />
              重新规划
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <h3 className="font-medium">今日意图:</h3>
            <p className="text-muted-foreground bg-secondary/20 p-3 rounded-md">{intention || "未设置今日意图"}</p>

            <Button className="w-full mt-4" onClick={onStartFocusing}>
              开始专注
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SunIcon className="h-5 w-5 text-yellow-500" />
            每日规划
          </div>
          <div className="text-sm text-muted-foreground">
            步骤 {currentStep}/{steps.length}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <TabsList className="grid w-full grid-cols-4">
            {steps.map((step) => (
              <TabsTrigger
                key={step.id}
                value={step.id.toString()}
                disabled={true}
                className={`flex items-center gap-1 ${currentStep === step.id ? "bg-primary text-primary-foreground" : ""}`}
              >
                {step.icon}
                <span className="hidden sm:inline">{step.title}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="space-y-4">
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold">迁移昨日未完成的任务</h3>
              <p className="text-muted-foreground">您可以选择迁移昨日未完成的任务到今天</p>

              <Button
                variant="outline"
                className="w-full mb-2"
                onClick={migrateYesterdayTasks}
                disabled={isMigrating}
              >
                {isMigrating ? (
                  <>
                    <RefreshCwIcon className="mr-2 h-4 w-4 animate-spin" />
                    迁移中...
                  </>
                ) : (
                  <>
                    <ClipboardListIcon className="mr-2 h-4 w-4" />
                    一键迁移昨日未完成任务
                  </>
                )}
              </Button>

              <div className="flex justify-end">
                <Button onClick={nextStep}>
                  继续
                  <ChevronRightIcon className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold">今日规划</h3>
              <p className="text-muted-foreground">描述今天的主要目标和意图</p>
              <Textarea
                placeholder="今天我想要..."
                value={intention}
                onChange={(e) => setIntention(e.target.value)}
                className="min-h-[100px]"
              />

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="update-existing"
                    checked={updateExisting}
                    onCheckedChange={setUpdateExisting}
                  />
                  <Label htmlFor="update-existing">同时更新今日现有待办</Label>
                </div>
                <Button
                  variant="outline"
                  onClick={simulateAiGeneration}
                >
                  <SparklesIcon className="mr-2 h-4 w-4" />
                  AI生成任务建议
                </Button>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={prevStep}>
                  <ChevronLeftIcon className="mr-2 h-4 w-4" />
                  返回
                </Button>
                <Button onClick={nextStep}>
                  继续
                  <ChevronRightIcon className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold">四象限规划</h3>
              <p className="text-muted-foreground">拖动任务到对应的象限，按照优先级进行分类</p>

              {/* 使用新的四象限组件替换原来的文本框 */}
              <QuadrantPlanner todos={todos} onUpdateTodo={onUpdateTodo} onRefresh={onDataRefresh} />

              <div className="flex justify-between">
                <Button variant="outline" onClick={prevStep}>
                  <ChevronLeftIcon className="mr-2 h-4 w-4" />
                  返回
                </Button>
                <Button onClick={nextStep}>
                  继续
                  <ChevronRightIcon className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="font-semibold">AI时间安排</h3>
              <p className="text-muted-foreground">根据您的任务，AI将为您安排今日时间表</p>

              {timeSchedule ? (
                <div className="bg-secondary/20 p-3 rounded-md whitespace-pre-line">
                  <h4 className="font-medium mb-2">您的今日时间表:</h4>
                  {timeSchedule}
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={generateTimeSchedule}
                  className="w-full"
                >
                  生成时间安排
                </Button>
              )}

              <div className="flex justify之间">
                <Button variant="outline" onClick={prevStep}>
                  <ChevronLeftIcon className="mr-2 h-4 w-4" />
                  返回
                </Button>
                <Button onClick={completePlanning}>
                  <CheckIcon className="mr-2 h-4 w-4" />
                  完成规划
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      {/* 使用提取的任务建议弹窗组件，添加成功回调 */}
      <TaskSuggestionDialog
        open={showTaskDialog}
        onOpenChange={setShowTaskDialog}
        generatedTasks={generatedTasksData}
        onSave={handleSaveTasks}
        onEdit={handleEditTask}
        onRemove={handleRemoveTask}
        onToggleEditing={toggleEditing}
        onSuccess={nextStep} // 添加成功回调，自动进入下一步
      />
      {/* 添加AI生成任务loading模态框 */}
      <LoadingModal
        open={isAiGenerating}
        title="AI正在生成任务建议"
        description="请稍等，我们正在根据您的规划生成智能任务建议..."
      />
    </Card>
  );
}
