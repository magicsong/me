import { tags as pomodoro_tags, todo_pomodoro_relations, todo_tag_relations, todos } from "@../../lib/db/schema";
import { db } from "@/lib/db";
import { and, desc, eq, like, or, sql } from "drizzle-orm";
import { getCurrentUserId } from "./utils";


// Todo类型定义
export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;
export type TodoTag = typeof pomodoro_tags.$inferSelect;

// 创建新的待办事项
export async function createTodo(
  data: Omit<NewTodo, "id" | "user_id" | "created_at" | "updated_at" | "completed_at">
) {
  const userId = await getCurrentUserId();
  
  const [todo] = await db
    .insert(todos)
    .values({
      ...data,
      user_id: userId,
    })
    .returning();
  
  return todo;
}

// 获取所有待办事项
export async function getAllTodos(
  filters?: {
    status?: string;
    priority?: string;
    search?: string;
    tagId?: number;
  }
) {
  const userId = await getCurrentUserId();
  
  let query = db
    .select({
      todo: todos,
      tags: sql<TodoTag[]>`
        COALESCE(
          (
            SELECT jsonb_agg(json_build_object('id', pt.id, 'name', pt.name, 'color', pt.color))
            FROM ${todo_tag_relations} AS ttr
            JOIN ${pomodoro_tags} AS pt ON pt.id = ttr.tag_id
            WHERE ttr.todo_id = ${todos.id}
          ),
          '[]'
        )
      `,
    })
    .from(todos)
    .where(eq(todos.user_id, userId));
  
  // 应用过滤条件
  if (filters) {
    if (filters.status) {
      query = query.where(eq(todos.status, filters.status as any));
    }
    
    if (filters.priority) {
      query = query.where(eq(todos.priority, filters.priority as any));
    }
    
    if (filters.search) {
      query = query.where(
        or(
          like(todos.title, `%${filters.search}%`),
          like(todos.description || '', `%${filters.search}%`)
        )
      );
    }
    
    if (filters.tagId) {
      query = query
        .innerJoin(todo_tag_relations, eq(todo_tag_relations.todo_id, todos.id))
        .where(eq(todo_tag_relations.tag_id, filters.tagId));
    }
  }
  
  // 按创建时间排序
  query = query.orderBy(desc(todos.created_at));
  
  const results = await query;
  return results;
}

// 获取单个待办事项
export async function getTodo(id: number) {
  const userId = await getCurrentUserId();
  
  const [result] = await db
    .select({
      todo: todos,
      tags: sql<TodoTag[]>`
        COALESCE(
          (
            SELECT jsonb_agg(json_build_object('id', pt.id, 'name', pt.name, 'color', pt.color))
            FROM ${todo_tag_relations} AS ttr
            JOIN ${pomodoro_tags} AS pt ON pt.id = ttr.tag_id
            WHERE ttr.todo_id = ${todos.id}
          ),
          '[]'
        )
      `,
    })
    .from(todos)
    .where(and(eq(todos.id, id), eq(todos.user_id, userId)));
  
  return {...result.todo, tags: result.tags};
}

// 更新待办事项
export async function updateTodo(
  id: number,
  data: Partial<Omit<NewTodo, "id" | "user_id" | "created_at">>
) {
  const userId = await getCurrentUserId();
  
  // 如果状态更新为已完成，设置完成时间
  let updateData = { ...data };
  if (data.status === "completed") {
    updateData.completed_at = new Date();
  }
  
  // 设置更新时间
  updateData.updated_at = new Date();
  
  const [todo] = await db
    .update(todos)
    .set(updateData)
    .where(and(eq(todos.id, id), eq(todos.user_id, userId)))
    .returning();
  
  return todo;
}

// 删除待办事项
export async function deleteTodo(id: number) {
  const userId = await getCurrentUserId();
  
  await db
    .delete(todos)
    .where(and(eq(todos.id, id), eq(todos.user_id, userId)));
  
  return { success: true };
}

// 关联标签与待办事项
export async function addTagToTodo(todoId: number, tagId: number) {
  const userId = await getCurrentUserId();
  
  // 确认待办事项存在且属于当前用户
  const todoExists = await db
    .select()
    .from(todos)
    .where(and(eq(todos.id, todoId), eq(todos.user_id, userId)));
  
  if (todoExists.length === 0) {
    throw new Error("待办事项不存在或无权访问");
  }
  
  // 添加关联
  await db
    .insert(todo_tag_relations)
    .values({ todo_id: todoId, tag_id: tagId })
    .onConflictDoNothing();
  
  return { success: true };
}

// 移除待办事项的标签
export async function removeTagFromTodo(todoId: number, tagId: number) {
  const userId = await getCurrentUserId();
  
  // 确认待办事项存在且属于当前用户
  const todoExists = await db
    .select()
    .from(todos)
    .where(and(eq(todos.id, todoId), eq(todos.user_id, userId)));
  
  if (todoExists.length === 0) {
    throw new Error("待办事项不存在或无权访问");
  }
  
  // 移除关联
  await db
    .delete(todo_tag_relations)
    .where(and(
      eq(todo_tag_relations.todo_id, todoId),
      eq(todo_tag_relations.tag_id, tagId)
    ));
  
  return { success: true };
}

// 关联番茄钟与待办事项
export async function linkPomodoroWithTodo(todoId: number, pomodoroId: number) {
  await db
    .insert(todo_pomodoro_relations)
    .values({ todo_id: todoId, pomodoro_id: pomodoroId })
    .onConflictDoNothing();
  
  return { success: true };
}

// 获取待办事项相关的番茄钟
export async function getTodoPomodoroRelations(todoId: number) {
  const userId = await getCurrentUserId();
  
  // 确认待办事项存在且属于当前用户
  const todoExists = await db
    .select()
    .from(todos)
    .where(and(eq(todos.id, todoId), eq(todos.user_id, userId)));
  
  if (todoExists.length === 0) {
    throw new Error("待办事项不存在或无权访问");
  }
  
  const relations = await db
    .select()
    .from(todo_pomodoro_relations)
    .where(eq(todo_pomodoro_relations.todo_id, todoId));
  
  return relations;
}
