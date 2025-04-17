import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TodoPriority } from "@/components/daily-start/todo-priority";
import { TodoItem } from "@/components/daily-start/todo-item";
import { DailyPlanningSteps } from "@/components/daily-start/daily-planning-steps";
import {
  SunIcon,
  ClockIcon,
  CalendarIcon,
  CheckIcon,
  XIcon
} from "lucide-react";
import { toast } from "sonner";
import { TodoBO } from "@/app/api/todo/types";

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
      if (selectedTodos.length === todos.length) {
        setSelectedTodos([]);
      } else {
        setSelectedTodos(todos.map((todo) => todo.id));
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
        body: JSON.stringify({ todo }),
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
  
  function handleStartFocusing() {
    // 进入时间轴视图
    onChangeTab();
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
          <CardTitle className="flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-blue-500" />
            任务管理
          </CardTitle>
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

              {todos.length > 0 ? (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                    >
                      {selectedTodos.length === todos.length ? "取消全选" : "全选"}
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

                  <div className="space-y-4">
                    {/* 按优先级分组展示 */}
                    {['urgent', 'high', 'medium', 'low'].map(priority => {
                      const priorityTodos = todos.filter(todo => todo.priority === priority);
                      if (priorityTodos.length === 0) return null;
                      
                      return (
                        <div key={priority} className="space-y-2">
                          <h3 className={`text-sm font-medium px-2 py-1 rounded-md inline-block
                            ${priority === 'urgent' ? 'bg-red-100 text-red-800' : 
                              priority === 'high' ? 'bg-orange-100 text-orange-800' : 
                              priority === 'medium' ? 'bg-blue-100 text-blue-800' : 
                              'bg-gray-100 text-gray-800'}`}>
                            {priority === 'urgent' ? '紧急' : 
                             priority === 'high' ? '重要' : 
                             priority === 'medium' ? '普通' : '低优先级'} 
                            ({priorityTodos.length})
                          </h3>
                          <div className="space-y-2 ml-2">
                            {priorityTodos.map((todo) => (
                              <TodoItem
                                key={todo.id}
                                todo={todo}
                                tags={todo.tags}
                                selected={selectedTodos.includes(todo.id)}
                                onSelect={(selected) => handleSelectTodo(todo.id, selected)}
                                onUpdate={updateTodo}
                                onComplete={completeTodo}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <XIcon className="mx-auto h-12 w-12 mb-4 text-muted-foreground" />
                  <p className="text-lg">还没有今天的任务，从昨天的任务添加一些吧！</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
