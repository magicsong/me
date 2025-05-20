import { TodoBO } from '@/app/api/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { PomodoroState, PomodoroStateActions } from '../hooks/use-pomodoro-state';

// 预设时间选项（分钟）
const PRESET_DURATIONS = [5, 10, 15, 20, 25, 30, 45, 60];

interface PomodoroFormProps {
  state: PomodoroState;
  actions: PomodoroStateActions;
  todos: TodoBO[];
  isLoadingTodos: boolean;
  isLoadingTodo: boolean;
  handleTodoSelection: (todoId: string) => void;
  tags: any[];
}

export function PomodoroForm({
  state,
  actions,
  todos,
  isLoadingTodos,
  isLoadingTodo,
  handleTodoSelection,
  tags
}: PomodoroFormProps) {
  const { 
    title, description, duration, customDuration, 
    relatedTodoId, isRunning, selectedTag 
  } = state;
  
  const { 
    setTitle, setDescription, setDuration, 
    setCustomDuration, setSelectedTag 
  } = actions;

  // 处理自定义时长变化
  const handleCustomDurationChange = (value: string) => {
    setCustomDuration(value);
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue > 0) {
      setDuration(numValue);
    }
  };

  function priorityText(priority: string) {
    switch (priority) {
      case 'urgent': return '紧急';
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return priority;
    }
  }
  
  function priorityColor(priority: string) {
    switch (priority) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-500';
    }
  }

  return (
    <div className="grid gap-4">
      {/* 待办事项选择器 */}
      <div>
        <Label htmlFor="todo">从待办事项选择</Label>
        <Select
          value={relatedTodoId?.toString() || ''}
          onValueChange={handleTodoSelection}
          disabled={isRunning || isLoadingTodos}
        >
          <SelectTrigger>
            <SelectValue placeholder={isLoadingTodos ? "正在加载待办事项..." : "选择一个待办事项"} />
          </SelectTrigger>
          <SelectContent>
            {todos
              .slice()
              .sort((a, b) => {
                if (a.plannedStartTime && b.plannedStartTime) {
                  return a.plannedStartTime.localeCompare(b.plannedStartTime);
                }
                if (a.plannedStartTime) return -1;
                if (b.plannedStartTime) return 1;
                return 0;
              })
              .map((todo) => (
                <SelectItem key={todo.id} value={todo.id.toString()}>
                  <div className="flex flex-col items-start">
                    <span>
                      {todo.title}
                      <span className={`ml-2 text-xs font-semibold ${priorityColor(todo.priority)}`}>
                        [{priorityText(todo.priority)}]
                      </span>
                    </span>
                    {todo.plannedStartTime && (
                      <span className="text-xs text-gray-400">
                        {todo.plannedStartTime}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            {todos.length === 0 && !isLoadingTodos && (
              <SelectItem value="none" disabled>
                没有可用的待办事项
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* 标题输入 */}
      <div>
        <Label htmlFor="title">
          标题 {relatedTodoId ? '(关联待办事项)' : ''} {isLoadingTodo && '加载中...'}
        </Label>
        <Input
          id="title"
          placeholder={isLoadingTodo ? "正在加载待办事项..." : "输入番茄钟标题"}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isRunning || isLoadingTodo}
        />
      </div>

      {/* 描述输入 */}
      <div>
        <Label htmlFor="description">描述（可选）</Label>
        <Textarea
          id="description"
          placeholder="输入描述..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isRunning}
        />
      </div>

      {/* 时长设置 */}
      <div>
        <Label htmlFor="duration">时长（分钟）</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {PRESET_DURATIONS.map((preset) => (
            <Button
              key={preset}
              variant={duration === preset ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setDuration(preset);
                setCustomDuration(preset.toString());
              }}
              disabled={isRunning}
              type="button"
            >
              {preset}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            id="duration"
            type="number"
            min="1"
            placeholder="自定义时长"
            value={customDuration}
            onChange={(e) => handleCustomDurationChange(e.target.value)}
            disabled={isRunning}
            className="w-full"
          />
        </div>
      </div>

      {/* 标签选择 */}
      {tags.length > 0 && (
        <div>
          <Label htmlFor="tag">标签（可选）</Label>
          <Select
            value={selectedTag}
            onValueChange={setSelectedTag}
            disabled={isRunning}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择标签" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">无标签</SelectItem>
              {tags.map((tag) => (
                <SelectItem key={tag.id} value={tag.id}>
                  {tag.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
