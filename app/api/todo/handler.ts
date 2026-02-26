import { TodoData, TodoPersistenceService, TodoWithTags } from '@/lib/persist/todo';
import { BaseApiHandler } from '../lib/BaseApiHandler';
import { BusinessObject } from '../lib/types';
import { TodoPromptBuilder, TodoOutputParser } from './prompt';
import { TodoBO } from '../types';
import { BaseRequest, BaseResponse } from '../lib/types';

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
      description: dataObject.description || undefined,
      status: dataObject.status,
      priority: dataObject.priority,
      plannedDate: dataObject.planned_date || undefined,
      plannedStartTime: dataObject.planned_start_time || undefined,
      plannedEndTime: dataObject.planned_end_time || undefined,
      completedAt: dataObject.completed_at || undefined,
      createdAt: dataObject.created_at,
      updatedAt: dataObject.updated_at,
      tags: (dataObject.tags || []).map(tag => ({
        id: tag.id,
        name: tag.name,
        color: tag.color || '',
        userId: dataObject.user_id,
        kind: undefined,
        category: undefined
      })),
      parentId: dataObject.parent_id || undefined,
      isLargeTask: dataObject.is_large_task || false,
      // 递归转换子任务
      subtasks: dataObject.subtasks ? dataObject.subtasks.map(sub => this.toBusinessObject(sub)) : undefined,
    };
  }

  toDataObject(businessObject: TodoBO): Partial<TodoData> {
    const result: any = {
      user_id: businessObject.userId,
      title: businessObject.title,
      description: businessObject.description,
      status: businessObject.status,
      priority: businessObject.priority,
      planned_date: businessObject.plannedDate,
      planned_start_time: businessObject.plannedStartTime,
      planned_end_time: businessObject.plannedEndTime,
      completed_at: businessObject.completedAt,
      parent_id: businessObject.parentId,
      is_large_task: businessObject.isLargeTask,
    };
    if (businessObject.id && businessObject.id > 0) {
      result.id = businessObject.id;
    }
    return result;
  }

  /**
   * 重写 handleCreate 方法，处理标签关联
   */
  async handleCreate(request: BaseRequest<TodoBO>): Promise<BaseResponse<TodoBO>> {
    try {
      // 调用父类的 handleCreate
      const response = await super.handleCreate(request);
      
      if (!response.success || !response.data || Array.isArray(response.data)) {
        return response;
      }

      // 处理标签关联
      const createdTodo = response.data as TodoBO;
      const tagIds = request.data?.tagIds || request.data?.tags?.map(tag => tag.id).filter(id => id !== undefined) || [];
      
      if (tagIds.length > 0 && createdTodo.id) {
        try {
          const todoService = this.persistenceService as TodoPersistenceService;
          await todoService.addTagsToTodo(createdTodo.id, tagIds as number[]);
          // 重新加载标签信息
          const freshTags = await todoService.getTagsForTodo(createdTodo.id);
          createdTodo.tags = freshTags.map(tag => ({
            id: tag.id,
            name: tag.name,
            color: tag.color || '',
            userId: createdTodo.userId,
            kind: undefined,
            category: undefined
          }));
        } catch (error) {
          console.error('添加标签关联失败:', error);
          // 不中断流程，只是记录错误
        }
      }

      return {
        success: true,
        data: createdTodo
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '创建资源失败'
      };
    }
  }

  /**
   * 重写 handleUpdate 方法，处理标签关联
   */
  async handleUpdate(request: BaseRequest<TodoBO>): Promise<BaseResponse<TodoBO>> {
    try {
      // 调用父类的 handleUpdate
      const response = await super.handleUpdate(request);
      
      if (!response.success || !response.data || Array.isArray(response.data)) {
        return response;
      }

      // 处理标签关联
      const updatedTodo = response.data as TodoBO;
      const newTagIds = request.data?.tagIds || request.data?.tags?.map(tag => tag.id).filter(id => id !== undefined) || [];
      
      if (updatedTodo.id) {
        try {
          const todoService = this.persistenceService as TodoPersistenceService;
          
          // 获取当前有效的标签ID
          const currentTags = await todoService.getTagsForTodo(updatedTodo.id);
          const currentTagIds = currentTags.map(tag => tag.id);
          
          // 找出需要删除和添加的标签
          const tagsToRemove = currentTagIds.filter(id => !newTagIds.includes(id));
          const tagsToAdd = (newTagIds as number[]).filter(id => !currentTagIds.includes(id));
          
          // 执行标签操作
          if (tagsToRemove.length > 0) {
            await todoService.removeTagsFromTodo(updatedTodo.id, tagsToRemove);
          }
          if (tagsToAdd.length > 0) {
            await todoService.addTagsToTodo(updatedTodo.id, tagsToAdd);
          }
          
          // 重新加载标签信息
          const freshTags = await todoService.getTagsForTodo(updatedTodo.id);
          updatedTodo.tags = freshTags.map(tag => ({
            id: tag.id,
            name: tag.name,
            color: tag.color || '',
            userId: updatedTodo.userId,
            kind: undefined,
            category: undefined
          }));
        } catch (error) {
          console.error('处理标签关联失败:', error);
          // 不中断流程，只是记录错误
        }
      }

      return {
        success: true,
        data: updatedTodo
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新资源失败'
      };
    }
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

  /**
   * 重写 handleBatchCreate 方法，处理标签关联
   */
  async handleBatchCreate(request: any): Promise<BaseResponse<TodoBO[]>> {
    try {
      // 调用父类的 handleBatchCreate
      const response = await super.handleBatchCreate(request);
      
      if (!response.success || !response.data || !Array.isArray(response.data)) {
        return response as BaseResponse<TodoBO[]>;
      }

      // 为每个创建的Todo处理标签关联
      const todoService = this.persistenceService as TodoPersistenceService;
      const createdTodos = response.data as TodoBO[];
      
      for (let i = 0; i < createdTodos.length; i++) {
        const createdTodo = createdTodos[i];
        const originalData = request.data?.[i];
        const tagIds = originalData?.tagIds || originalData?.tags?.map((tag: any) => tag.id).filter((id: any) => id !== undefined) || [];
        
        if (tagIds.length > 0 && createdTodo.id) {
          try {
            await todoService.addTagsToTodo(createdTodo.id, tagIds as number[]);
            // 重新加载标签信息
            const freshTags = await todoService.getTagsForTodo(createdTodo.id);
            createdTodo.tags = freshTags.map(tag => ({
              id: tag.id,
              name: tag.name,
              color: tag.color || '',
              userId: createdTodo.userId,
              kind: undefined,
              category: undefined
            }));
          } catch (error) {
            console.error('为批量创建的Todo添加标签关联失败:', error);
          }
        }
      }

      return {
        success: true,
        data: createdTodos
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '批量创建资源失败'
      };
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
