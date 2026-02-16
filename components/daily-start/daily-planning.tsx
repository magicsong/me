import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { TodoPriority } from "@/components/daily-start/todo-priority";
import { TodoItem } from "@/components/daily-start/todo-item";
import { SubtasksDisplay } from "@/components/daily-start/subtasks-display";
import { DailyPlanningSteps } from "@/components/daily-start/daily-planning-steps";
import {
  SunIcon,
  ClockIcon,
  CalendarIcon,
  CheckIcon,
  XIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from "lucide-react";
import { toast } from "sonner";
import { TodoBO } from "@/app/api/types";
import { deleteTodo } from "@/app/(dashboard)/habits/client-actions";
import { useRouter } from "next/navigation";

interface DailyPlanningProps {
  todos: TodoBO[];
  yesterdayTodos: TodoBO[];
  onChangeTab: () => void;
  onDataRefresh: () => void; // 添加数据刷新回调
}

export function DailyPlanning({
  todos,
  yesterdayTodos,
  onChangeTab,
  onDataRefresh
}: DailyPlanningProps) {
  const [selectedTodos, setSelectedTodos] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState("today");
  const [showCompleted, setShowCompleted] = useState(false);
  const [pendingCollapsed, setPendingCollapsed] = useState<boolean>(false);
  const router = useRouter();
  // 根据showCompleted状态过滤任务
  // 注意：后端已经确保返回的是主任务列表，子任务包含在主任务的 subtasks 字段中
  const filteredTodos = useMemo(() => {
    let result = todos;
    if (!showCompleted) {
      result = todos.filter(todo => todo.status !== "completed");
    }

    // 按状态对任务进行排序，让in_progress排在前面
    return [...result].sort((a, b) => {
      // 优先按状态排序：in_progress > pending > completed
      if (a.status === "in_progress" && b.status !== "in_progress") return -1;
      if (a.status !== "in_progress" && b.status === "in_progress") return 1;
      if (a.status === "pending" && b.status === "completed") return -1;
      if (a.status === "completed" && b.status === "pending") return 1;

      // 状态相同时，按优先级排序
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [todos, showCompleted]);

  // 过滤未完成的昨日任务
  const incompleteTodos = yesterdayTodos.filter(
    (todo) => todo.status !== "completed"
  );

  // 使用useMemo获取今日任务的分类统计，确保todos变化时重新计算
  const todayStats = useMemo(() => ({
    total: todos.length,
    completed: todos.filter((todo) => todo.status === "completed").length,
    urgent: todos.filter((todo) => todo.priority === "urgent").length,
    important: todos.filter((todo) => todo.priority === "high").length,
    normal: todos.filter((todo) => todo.priority === "medium").length,
    low: todos.filter((todo) => todo.priority === "low").length
  }), [todos]);


  function handleSelectTodo(todoId: number, selected: boolean) {
    if (selected) {
      setSelectedTodos([...selectedTodos, todoId]);
    } else {
      setSelectedTodos(selectedTodos.filter(id => id !== todoId));
    }
  }

  function handleSelectAll() {
    if (activeTab === "yesterday") {
      if (selectedTodos.length === incompleteTodos.length) {
        setSelectedTodos([]);
      } else {
        setSelectedTodos(incompleteTodos.map((todo) => todo.id));
      }
    } else {
      if (selectedTodos.length === filteredTodos.length) {
        setSelectedTodos([]);
      } else {
        setSelectedTodos(filteredTodos.map((todo) => todo.id));
      }
    }
  }

  // 更新单个待办事项
  async function updateTodo(todo: TodoBO): Promise<boolean> {
    try {
      const response = await fetch('/api/todo/' + todo.id, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data: todo }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("待办事项已更新");
        return true;
      } else {
        toast.error(result.error || "更新失败");
        return false;
      }
    } catch (error) {
      console.error("更新待办事项失败:", error);
      toast.error("更新待办事项时出错");
      return false;
    }
  }

  const handleDelete = async (todoId: number): Promise<boolean> => {

    try {
      const result = await deleteTodo(todoId)
      if (result) {
        toast.success("待办事项已删除");
        onDataRefresh()
      }
      return result
    } catch (error) {
      console.error('删除待办事项出错:', error);
      toast.error("删除出错");
      return false;
    }
  }

  // 批量更新待办事项字段
  async function batchUpdateField(field: string, updates: { id: number; value: any }[]): Promise<boolean> {
    try {
      // 提取所有ID
      const ids = updates.map(update => update.id);

      // 创建字段对象 - 注意：这假设所有记录更新为相同的值
      // 如果每个记录值不同，后端需要支持这种格式
      const fields = { [field]: updates[0].value };

      const response = await fetch('/api/todo', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: ids,       // 批量更新的ID数组
          fields: fields  // 要更新的字段和值
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || "批量更新成功");
        return true;
      } else {
        toast.error(result.error || "批量更新失败");
        return false;
      }
    } catch (error) {
      console.error("批量更新待办事项失败:", error);
      toast.error("批量更新待办事项时出错");
      return false;
    }
  }
  async function completeTodo(todoId: number): Promise<boolean> {
    try {
      const response = await fetch('/api/todo/' + todoId + '/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      if (result.success) {
        toast.success("待办事项已完成");
        // Refresh the todo list after successful completion
        onDataRefresh();
        return true;
      } else {
        toast.error(result.error || "完成失败");
        return false;
      }
    } catch (error) {
      console.error("完成待办事项失败:", error);
      toast.error("完成待办事项时出错");
      return false;
    }
  }
  // 批量更新待办事项状态
  async function batchUpdateStatus(status: boolean, todoIds: string[]): Promise<boolean> {
    try {
      const response = await fetch('/api/todo/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          todoIds
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || "批量更新状态成功");
        return true;
      } else {
        toast.error(result.error || "批量更新状态失败");
        return false;
      }
    } catch (error) {
      console.error("批量更新待办事项状态失败:", error);
      toast.error("批量更新待办事项状态时出错");
      return false;
    }
  }

  async function handleBatchMoveTodayWithPriority(priority: string) {
    if (selectedTodos.length === 0) {
      toast.error("请先选择任务");
      return;
    }

    // 获取所有选中的待办事项
    const todosToUpdate = incompleteTodos
      .filter((todo) => selectedTodos.includes(todo.id))
      .map((todo) => ({
        id: todo.id,
        value: new Date().toISOString()
      }));

    // 更新计划日期
    const success = await batchUpdateField("plannedDate", todosToUpdate);

    if (success) {
      // 调用数据刷新回调，更新今日和昨日的任务数据
      onDataRefresh();
      setActiveTab("today");
      setSelectedTodos([]);
    }
  }

  async function handleBatchSetPriority(priority: string) {
    if (selectedTodos.length === 0) {
      toast.error("请先选择任务");
      return;
    }

    // 批量更新优先级
    const success = await batchUpdateField("priority",
      selectedTodos.map(id => ({
        id: String(id),
        value: priority
      }))
    );

    if (success) {
      setSelectedTodos([]);
    }
  }

  async function handleBatchComplete() {
    if (selectedTodos.length === 0) {
      toast.error("请先选择任务");
      return;
    }

    // 批量更新状态为已完成
    const success = await batchUpdateStatus(true, selectedTodos.map(id => String(id)));

    if (success) {
      setSelectedTodos([]);
    }
  }

  function handleStartFocusing(id?: string) {
    if (id) {
      router.push(`/pomodoro?todoId=${id}`);
    } else {
      // Navigate to the pomodoro page
      router.push('/pomodoro');
    }
  }

  return (
    <div className="space-y-6">
      {/* 每日规划步骤组件 - 传递todos和onDataRefresh */}
      <DailyPlanningSteps
        onStartFocusing={handleStartFocusing}
        todos={todos}
        onDataRefresh={onDataRefresh}
      />

      {/* 待办事项管理 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-blue-500" />
              任务管理
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Switch
                id="show-completed"
                checked={showCompleted}
                onCheckedChange={setShowCompleted}
              />
              <Label htmlFor="show-completed">显示已完成任务</Label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="today">
                <SunIcon className="mr-2 h-4 w-4" />
                今日任务 ({todos.length})
              </TabsTrigger>
              <TabsTrigger value="yesterday">
                <CalendarIcon className="mr-2 h-4 w-4" />
                昨日任务 ({incompleteTodos.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="yesterday" className="space-y-4">
              {incompleteTodos.length > 0 ? (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                    >
                      {selectedTodos.length === incompleteTodos.length ? "取消全选" : "全选"}
                    </Button>
                  </div>

                  <Tabs defaultValue="all">
                    <TabsList className="mb-4">
                      <TabsTrigger value="all" className="flex items-center gap-1">
                        <CalendarIcon className="h-4 w-4" />
                        全部 ({incompleteTodos.length})
                      </TabsTrigger>
                      {['urgent', 'high', 'medium', 'low'].map(priority => {
                        const count = incompleteTodos.filter(todo => todo.priority === priority).length;
                        if (count === 0) return null;
                        return (
                          <TabsTrigger key={priority} value={priority} className="flex items-center gap-1">
                            <TodoPriority priority={priority} showLabel={false} />
                            {priority === 'urgent' ? '紧急' :
                              priority === 'high' ? '重要' :
                                priority === 'medium' ? '普通' : '低优先级'}
                            ({count})
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>

                    <TabsContent value="all" className="space-y-4">
                      {['urgent', 'high', 'medium', 'low'].map(priority => {
                        const priorityTodos = incompleteTodos.filter(todo => todo.priority === priority);
                        if (priorityTodos.length === 0) return null;

                        return (
                          <div key={priority} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <h3 className={`text-sm font-medium px-3 py-2 rounded-md inline-flex items-center gap-2
                                ${priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                  priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                    priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                                      'bg-gray-100 text-gray-800'}`}>
                                <TodoPriority priority={priority} showLabel={false} />
                                {priority === 'urgent' ? '紧急' :
                                  priority === 'high' ? '重要' :
                                    priority === 'medium' ? '普通' : '低优先级'}
                                ({priorityTodos.length})
                              </h3>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleBatchMoveTodayWithPriority(priority)}
                                className="flex items-center gap-1"
                              >
                                <SunIcon className="h-3 w-3" />
                                移至今日
                              </Button>
                            </div>
                            <div className="space-y-2 ml-2">
                              {priorityTodos.map((todo) => (
                                <TodoItem
                                  key={todo.id}
                                  todo={todo}
                                  tags={todo.tags}
                                  selected={selectedTodos.includes(todo.id)}
                                  onSelect={(selected) => handleSelectTodo(todo.id, selected)}
                                  onUpdate={updateTodo}
                                  onDelete={handleDelete}
                                  onStartPomodoro={() => handleStartFocusing(todo.id)}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </TabsContent>

                    {['urgent', 'high', 'medium', 'low'].map(priority => {
                      const priorityTodos = incompleteTodos.filter(todo => todo.priority === priority);
                      if (priorityTodos.length === 0) return null;

                      return (
                        <TabsContent key={priority} value={priority} className="space-y-4">
                          <div className="flex justify-between items-center mb-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const todoIds = priorityTodos.map(todo => todo.id);
                                if (todoIds.every(id => selectedTodos.includes(id))) {
                                  setSelectedTodos(selectedTodos.filter(id => !todoIds.includes(id)));
                                } else {
                                  setSelectedTodos([...new Set([...selectedTodos, ...todoIds])]);
                                }
                              }}
                            >
                              {priorityTodos.every(todo => selectedTodos.includes(todo.id)) ? "取消全选" : "全选"}
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleBatchMoveTodayWithPriority(priority)}
                              className="flex items-center gap-1"
                            >
                              <SunIcon className="h-3 w-3" />
                              移至今日
                            </Button>
                          </div>

                          <div className="space-y-2">
                            {priorityTodos.map((todo) => (
                              <TodoItem
                                key={todo.id}
                                todo={todo}
                                tags={todo.tags}
                                selected={selectedTodos.includes(todo.id)}
                                onSelect={(selected) => handleSelectTodo(todo.id, selected)}
                                onUpdate={updateTodo}
                                onDelete={handleDelete}
                              />
                            ))}
                          </div>
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckIcon className="mx-auto h-12 w-12 mb-4 text-green-500" />
                  <p className="text-lg">太好了！昨天的任务全部完成了。</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="today" className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
                <Card className="bg-secondary/20">
                  <CardContent className="pt-4 text-center">
                    <p className="text-sm text-muted-foreground">总计</p>
                    <p className="text-2xl font-bold">{todayStats.total}</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-500/10">
                  <CardContent className="pt-4 text-center">
                    <p className="text-sm text-muted-foreground">已完成</p>
                    <p className="text-2xl font-bold">{todayStats.completed}</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-500/10">
                  <CardContent className="pt-4 text-center">
                    <p className="text-sm text-muted-foreground">紧急</p>
                    <p className="text-2xl font-bold">{todayStats.urgent}</p>
                  </CardContent>
                </Card>
                <Card className="bg-orange-500/10">
                  <CardContent className="pt-4 text-center">
                    <p className="text-sm text-muted-foreground">重要</p>
                    <p className="text-2xl font-bold">{todayStats.important}</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-500/10">
                  <CardContent className="pt-4 text-center">
                    <p className="text-sm text-muted-foreground">普通</p>
                    <p className="text-2xl font-bold">{todayStats.normal + todayStats.low}</p>
                  </CardContent>
                </Card>
              </div>

              {filteredTodos.length > 0 ? (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                    >
                      {selectedTodos.length === filteredTodos.length ? "取消全选" : "全选"}
                    </Button>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBatchSetPriority("urgent")}
                        className="flex items-center gap-1"
                      >
                        <TodoPriority priority="urgent" showLabel={false} />
                        标记
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBatchSetPriority("high")}
                        className="flex items-center gap-1"
                      >
                        <TodoPriority priority="high" showLabel={false} />
                        标记
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBatchSetPriority("medium")}
                        className="flex items-center gap-1"
                      >
                        <TodoPriority priority="medium" showLabel={false} />
                        标记
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleBatchComplete}
                        className="flex items-center gap-1"
                      >
                        <CheckIcon className="h-3 w-3" />
                        完成
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-6">
  {/* 先按状态分组展示 */}
  {["in_progress", "pending"].map(status => {
    const statusTodos = filteredTodos.filter(todo => todo.status === status);
    if (statusTodos.length === 0) return null;

    return (
      <div key={status}>
        <Card className={`
          ${status === 'in_progress' ? 'border-blue-300 shadow-sm' : 'border-gray-200'}
        `}>
          <CardHeader className={`py-3 ${status === 'in_progress' ? 'bg-blue-50' : 'bg-gray-50'}`}>
            <div className="flex justify-between items-center">
              <h3 className={`text-sm font-medium rounded-md inline-flex items-center gap-2
                ${status === 'in_progress' ? 'text-blue-700' : 'text-gray-700'}`}>
                {status === 'in_progress' ? (
                  <>
                    <ClockIcon className="h-4 w-4" />
                    进行中
                  </>
                ) : (
                  <>
                    <CalendarIcon className="h-4 w-4" />
                    等待排期处理
                  </>
                )}
                <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full text-xs">
                  {statusTodos.length}
                </span>
              </h3>
              
              {status === 'pending' && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setPendingCollapsed(!pendingCollapsed)}
                  className="h-8 w-8 p-0"
                >
                  {pendingCollapsed ? (
                    <ChevronDownIcon className="h-4 w-4" />
                  ) : (
                    <ChevronUpIcon className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          
          {(status !== 'pending' || !pendingCollapsed) && (
            <CardContent className="pt-4">
              {/* 在每个状态组内按优先级分组展示 */}
              <div className="space-y-4">
                {['urgent', 'high', 'medium', 'low'].map(priority => {
                  const priorityTodos = statusTodos.filter(todo => todo.priority === priority);
                  if (priorityTodos.length === 0) return null;

                  return (
                    <div key={priority} className="space-y-2">
                      <h4 className={`text-xs font-medium px-2 py-1 rounded-md inline-block
                        ${priority === 'urgent' ? 'bg-red-100 text-red-800' :
                         priority === 'high' ? 'bg-orange-100 text-orange-800' :
                         priority === 'medium' ? 'bg-blue-100 text-blue-800' :
                         'bg-gray-100 text-gray-800'}`}>
                        {priority === 'urgent' ? '紧急' :
                         priority === 'high' ? '重要' :
                         priority === 'medium' ? '普通' : '低优先级'}
                        ({priorityTodos.length})
                      </h4>
                      <div className="space-y-2 ml-2">
                        {priorityTodos.map((todo) => (
                          <div key={todo.id}>
                            <TodoItem
                              todo={todo}
                              tags={todo.tags}
                              selected={selectedTodos.includes(todo.id)}
                              onSelect={(selected) => handleSelectTodo(todo.id, selected)}
                              onUpdate={updateTodo}
                              onComplete={completeTodo}
                              onDelete={handleDelete}
                              onStartPomodoro={() => handleStartFocusing(String(todo.id))}
                            />
                            {/* 显示子任务 */}
                            <SubtasksDisplay
                              parentTodo={todo}
                              allTodos={todos}
                              onDataRefresh={onDataRefresh}
                              onUpdateTodo={updateTodo}
                              onDeleteTodo={handleDelete}
                              onStartPomodoro={(subtaskId) => handleStartFocusing(String(subtaskId))}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    );
  })}

  {/* 如果启用了显示已完成任务 */}
  {showCompleted && (
    <Card className="border-green-200">
      <CardHeader className="py-3 bg-green-50">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium text-green-800 inline-flex items-center gap-2">
            <CheckIcon className="h-4 w-4" />
            已完成
            <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs">
              {todos.filter(todo => todo.status === "completed").length}
            </span>
          </h3>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-2 opacity-70">
          {todos
            .filter(todo => todo.status === "completed")
            .map((todo) => (
              <div key={todo.id}>
                <TodoItem
                  todo={todo}
                  tags={todo.tags}
                  selected={selectedTodos.includes(todo.id)}
                  onSelect={(selected) => handleSelectTodo(todo.id, selected)}
                  onUpdate={updateTodo}
                  onDelete={handleDelete}
                />
                {/* 显示已完成任务的子任务 */}
                <SubtasksDisplay
                  parentTodo={todo}
                  allTodos={todos}
                  onDataRefresh={onDataRefresh}
                  onUpdateTodo={updateTodo}
                  onDeleteTodo={handleDelete}
                  onStartPomodoro={(subtaskId) => handleStartFocusing(String(subtaskId))}
                />
              </div>
            ))
          }
        </div>
      </CardContent>
    </Card>
  )}
</div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  {showCompleted ? (
                    <XIcon className="mx-auto h-12 w-12 mb-4 text-muted-foreground" />
                  ) : (
                    <CheckIcon className="mx-auto h-12 w-12 mb-4 text-green-500" />
                  )}
                  <p className="text-lg">
                    {showCompleted
                      ? "还没有今天的任务，从昨天的任务添加一些吧！"
                      : "太好了！今天的任务全部完成了。"}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
