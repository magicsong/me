import { TodoData, TodoPersistenceService } from '@/lib/persist/todo';
import { BaseApiHandler } from '../lib/BaseApiHandler';
import { BusinessObject } from '../lib/types';
import { TodoPromptBuilder, TodoOutputParser } from './prompt';
import { TodoBO } from '../types';

export class TodoApiHandler extends BaseApiHandler<TodoData, TodoBO> {
  validateBO(data: TodoBO): boolean {
    if (!data) return false;

    // title 是必需的
    if (!data.title) return false;

    // 验证 status 的有效性
    if (data.status && !['pending', 'in_progress', 'completed', 'archived'].includes(data.status)) {
      return false;
    }

    // 验证 priority 的有效性
    if (data.priority && !['urgent', 'high', 'medium', 'low'].includes(data.priority)) {
      return false;
    }

    return true;
  }

  setDefaultsBO(businessObject: Partial<TodoBO>, isUpdate: boolean): Partial<TodoBO> {
    const now = new Date();
    
    // 创建一个新对象，保留所有原始字段
    const result = { ...businessObject };

    // 设置默认值
    if (!isUpdate) {
      result.createdAt = now.toISOString();
      result.updatedAt = now.toISOString();
      if (!result.plannedDate) {
        result.plannedDate = now.toISOString();
      }
      // 设置默认的状态和优先级
      if (!result.status) {
        result.status = 'pending';
      }
      if (!result.priority) {
        result.priority = 'medium';
      }
    } else {
      result.updatedAt = now.toISOString();
    }
    return result;
  }
  protected generateId(): string {
    // 在这个实现中，我们依赖于数据库来生成 ID
    return '';
  }

  getResourceName(): string {
    return 'todo';
  }

  toBusinessObject(dataObject: TodoData): TodoBO {
    return {
      id: dataObject.id,
      userId: dataObject.user_id,
      title: dataObject.title,
      description: dataObject.description,
      status: dataObject.status,
      priority: dataObject.priority,
      plannedDate: dataObject.planned_date,
      plannedStartTime: dataObject.planned_start_time,
      plannedEndTime: dataObject.planned_end_time,
      completedAt: dataObject.completed_at,
      createdAt: dataObject.created_at,
      updatedAt: dataObject.updated_at,
      tags: dataObject.tags,
      parentId: dataObject.parent_id,
      isLargeTask: dataObject.is_large_task,
    };
  }

  toDataObject(businessObject: TodoBO): Partial<TodoData> {
    const result = {
      user_id: businessObject.userId,
      title: businessObject.title,
      description: businessObject.description,
      status: businessObject.status,
      priority: businessObject.priority,
      planned_date: businessObject.plannedDate,
      planned_start_time: businessObject.plannedStartTime,
      planned_end_time: businessObject.plannedEndTime,
      completed_at: businessObject.completedAt,
      tag_ids: businessObject.tagIds,
      parent_id: businessObject.parentId,
      is_large_task: businessObject.isLargeTask,
    };
    if (businessObject.id && businessObject.id > 0) {
      result["id"] = businessObject.id;
    }
    return result;
  }

  toBusinessObjects(dataObjects: TodoData[]): TodoBO[] {
    return dataObjects.map(data => this.toBusinessObject(data));
  }

  toDataObjects(businessObjects: TodoBO[]): Partial<TodoData>[] {
    return businessObjects.map(bo => this.toDataObject(bo));
  }

  /**
     * 根据日期获取 Todo
     * @param date 日期
     * @param userId 用户ID
     * @param includePrevious 是否包含早于指定日期的待办事项，默认为false
     */
  async getByDate(date: Date, userId: string, includePrevious: boolean = false): Promise<TodoBO[]> {
    let resultDo = []
    if (!includePrevious) {
      // 只获取特定日期的待办事项
      resultDo = await this.persistenceService.findMany({
        user_id: userId,
        planned_date: date.toISOString()
      });
    } else {
      // 获取早于或等于指定日期的待办事项
      resultDo = await this.persistenceService.findMany({
        user_id: userId,
        planned_date: { lte: date.toISOString() }
      });
    }
    return this.toBusinessObjects(resultDo);
  }

  // 批量更新待办事项
  async batchUpdateTodos(todos: Partial<TodoBO>[]): Promise<TodoBO[]> {
    try {
      const updateOperations = todos.map(todo => ({
        id: todo.id!,
        data: this.toDataObject(todo as TodoBO)
      }));

      const updatedTodos = await this.persistenceService.updateMany(updateOperations);
      return this.toBusinessObjects(updatedTodos);
    } catch (error) {
      console.error('批量更新待办事项失败:', error);
      throw error;
    }
  }

  // 获取待办事项及其标签
  async getTodoWithTags(todoId: number): Promise<TodoWithTags | null> {
    try {
      const todoService = this.persistenceService as TodoPersistenceService;
      if (typeof todoService.getTodoWithTags !== 'function') {
        throw new Error('持久化服务不支持获取待办事项及其标签');
      }

      return await todoService.getTodoWithTags(todoId);
    } catch (error) {
      console.error('获取待办事项及其标签失败:', error);
      return null;
    }
  }

  static override create<TodoData, TodoBO extends BusinessObject>(): BaseApiHandler<TodoData, TodoBO> {
    const persistenceService = new TodoPersistenceService();
    const promptBuilder = new TodoPromptBuilder();
    const outputParser = new TodoOutputParser();

    return new TodoApiHandler(
      persistenceService,
      promptBuilder,
      outputParser
    ) as unknown as BaseApiHandler<TodoData, TodoBO>;
  }
}
