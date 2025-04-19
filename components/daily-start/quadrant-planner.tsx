import { TodoBO } from "@/app/api/types";
import { TodoPriority } from "@/components/daily-start/todo-priority";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { toast } from "sonner";

interface QuadrantPlannerProps {
  todos: TodoBO[];
  onRefresh: () => void; // 添加刷新回调函数
}

// 定义四个象限的类型
type Quadrant = "urgentImportant" | "notUrgentImportant" | "urgentNotImportant" | "notUrgentNotImportant";

// 将todo分类到对应的象限
const categorizeTodos = (todos: TodoBO[]) => {
  const result = {
    urgentImportant: [] as TodoBO[],
    notUrgentImportant: [] as TodoBO[],
    urgentNotImportant: [] as TodoBO[],
    notUrgentNotImportant: [] as TodoBO[],
  };

  todos.forEach(todo => {
    // 如果任务已完成，则不放入四象限
    if (todo.status === 'completed') return;
    
    // 根据优先级分类
    if (todo.priority === "urgent") {
      result.urgentImportant.push(todo);
    } else if (todo.priority === "high") {
      result.notUrgentImportant.push(todo);
    } else if (todo.priority === "medium") {
      result.urgentNotImportant.push(todo);
    } else {
      result.notUrgentNotImportant.push(todo);
    }
  });

  return result;
};

// 使用PATCH请求更新优先级
const updateTodoPriority = async (todoId: number, priority: string): Promise<boolean> => {
  try {
    const response = await fetch(`/api/todo/${todoId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: { priority } // 只传递需要更新的字段
      }),
    });
    
    const result = await response.json();
    
    if (result.success) {
      toast.success("优先级已更新");
      return true;
    } else {
      toast.error(result.error || "更新失败");
      return false;
    }
  } catch (error) {
    console.error("更新任务优先级失败:", error);
    toast.error("更新任务优先级时出错");
    return false;
  }
};

// 拖拽的任务项组件
const DraggableTodoItem = ({ todo, onMove }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'TODO',
    item: { id: todo.id },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div 
      ref={drag} 
      className={`p-2 mb-2 bg-card rounded shadow-sm border ${isDragging ? 'opacity-50' : ''}`}
      style={{ cursor: 'move' }}
    >
      <div className="flex items-center gap-2">
        <TodoPriority priority={todo.priority} showLabel={false} />
        <span className="truncate">{todo.title}</span>
      </div>
    </div>
  );
};

// 可放置的象限区域
const QuadrantDropZone = ({ quadrant, todos, onMove }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'TODO',
    drop: (item: { id: number }) => {
      // 确定要设置的新优先级
      let newPriority;
      switch (quadrant) {
        case "urgentImportant": newPriority = "urgent"; break;
        case "notUrgentImportant": newPriority = "high"; break;
        case "urgentNotImportant": newPriority = "medium"; break;
        case "notUrgentNotImportant": newPriority = "low"; break;
      }
      
      onMove(item.id, newPriority);
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  // 设置四个象限的不同背景色和标题
  let title = "";
  let bgColor = "";
  
  switch (quadrant) {
    case "urgentImportant":
      title = "紧急且重要";
      bgColor = "bg-red-50 border-red-200";
      break;
    case "notUrgentImportant":
      title = "重要但不紧急";
      bgColor = "bg-blue-50 border-blue-200";
      break;
    case "urgentNotImportant":
      title = "紧急但不重要";
      bgColor = "bg-yellow-50 border-yellow-200";
      break;
    case "notUrgentNotImportant":
      title = "既不紧急也不重要";
      bgColor = "bg-gray-50 border-gray-200";
      break;
  }

  return (
    <div 
      ref={drop} 
      className={`p-3 rounded-lg border ${bgColor} ${isOver ? 'ring-2 ring-primary' : ''} h-full min-h-[200px] flex flex-col`}
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium">{title}</h3>
        <Badge variant="outline">{todos.length}</Badge>
      </div>
      <div className="space-y-2 flex-grow overflow-auto">
        {todos.map(todo => (
          <DraggableTodoItem key={todo.id} todo={todo} onMove={onMove} />
        ))}
        {todos.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-4">
            拖动任务到此区域
          </div>
        )}
      </div>
    </div>
  );
};

export function QuadrantPlanner({ todos, onRefresh }: QuadrantPlannerProps) {
  const [categorizedTodos, setCategorizedTodos] = useState(categorizeTodos(todos));

  // 当todos变化时重新分类
  useEffect(() => {
    setCategorizedTodos(categorizeTodos(todos));
  }, [todos]);

  // 处理任务移动 - 使用PATCH请求更新优先级
  const handleMoveTodo = async (todoId: number, newPriority: string) => {
    // 调用优先级更新函数
    const success = await updateTodoPriority(todoId, newPriority);
    
    if (success && onRefresh) {
      // 刷新数据
      onRefresh();
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <QuadrantDropZone 
          quadrant="urgentImportant" 
          todos={categorizedTodos.urgentImportant} 
          onMove={handleMoveTodo} 
        />
        <QuadrantDropZone 
          quadrant="notUrgentImportant" 
          todos={categorizedTodos.notUrgentImportant} 
          onMove={handleMoveTodo} 
        />
        <QuadrantDropZone 
          quadrant="urgentNotImportant" 
          todos={categorizedTodos.urgentNotImportant} 
          onMove={handleMoveTodo} 
        />
        <QuadrantDropZone 
          quadrant="notUrgentNotImportant" 
          todos={categorizedTodos.notUrgentNotImportant} 
          onMove={handleMoveTodo} 
        />
      </div>
    </DndProvider>
  );
}
