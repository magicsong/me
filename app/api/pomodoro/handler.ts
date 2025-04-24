import { PomodoroData, PomodoroPersistenceService } from '@/lib/persist/pomodoro';
import { BaseApiHandler } from "../lib/BaseApiHandler";
import { BusinessObject } from '../lib/types';
import { PomodoroBO } from '../types';
import { todo } from 'node:test';

export class PomodoroApiHandler extends BaseApiHandler<PomodoroData, PomodoroBO> {
  validateBO(data: PomodoroBO): boolean {
    if (!data) return false;

    // title 是必需的
    if (!data.title) return false;

    // 验证 status 的有效性
    if (data.status && !['running', 'completed', 'canceled', 'paused'].includes(data.status)) {
      return false;
    }

    // 验证 duration 的有效性
    if (typeof data.duration !== 'number' || data.duration <= 0) {
      return false;
    }

    // 必须有开始时间
    if (!data.startTime) return false;

    if (!data.habitId && !data.todoId) {
      console.log("验证失败: 必须提供 habitId 或 todoId");
      return false;
    }

    return true;
  }

  setDefaultsBO(businessObject: Partial<PomodoroBO>, isUpdate: boolean): Partial<PomodoroBO> {
    const now = new Date();

    // 设置默认值
    if (!isUpdate) {
      businessObject.createdAt = now.toISOString();
      businessObject.startTime = businessObject.startTime || now.toISOString();

      // 设置默认的状态和时长
      if (!businessObject.status) {
        businessObject.status = 'running';
      }
      if (!businessObject.duration) {
        businessObject.duration = 25; // 默认25分钟
      }
    }

    // 如果状态改为completed，设置结束时间
    if (businessObject.status === 'completed' && !businessObject.endTime) {
      businessObject.endTime = now.toISOString();
    }

    return businessObject;
  }

  protected generateId(): string {
    // 在这个实现中，依赖于数据库来生成 ID
    return '';
  }

  getResourceName(): string {
    return 'pomodoro';
  }

  toBusinessObject(dataObject: PomodoroData): PomodoroBO {
    return {
      id: dataObject.id,
      userId: dataObject.user_id,
      title: dataObject.title,
      description: dataObject.description ?? undefined,
      duration: dataObject.duration,
      status: dataObject.status,
      startTime: dataObject.start_time,
      endTime: dataObject.end_time ?? undefined,
      habitId: dataObject.habit_id ?? undefined,
      goalId: dataObject.goal_id ?? undefined,
      todoId: dataObject.todo_id ?? undefined,
      createdAt: dataObject.created_at,
      tags: dataObject.tags,
    };
  }

  toDataObject(businessObject: PomodoroBO): Partial<PomodoroData> {
    const result = {
      user_id: businessObject.userId,
      title: businessObject.title,
      description: businessObject.description,
      duration: businessObject.duration,
      status: businessObject.status,
      start_time: businessObject.startTime,
      end_time: businessObject.endTime,
      habit_id: businessObject.habitId,
      todo_id: businessObject.todoId,
      goal_id: businessObject.goalId,
    };
    if (businessObject.id && businessObject.id > 0) {
      result["id"] = businessObject.id;
    }
    return result;
  }

  toBusinessObjects(dataObjects: PomodoroData[]): PomodoroBO[] {
    return dataObjects.map(data => this.toBusinessObject(data));
  }

  toDataObjects(businessObjects: PomodoroBO[]): Partial<PomodoroData>[] {
    return businessObjects.map(bo => this.toDataObject(bo));
  }

  /**
   * 完成番茄钟
   */
  async completePomodoro(pomodoroId: number): Promise<PomodoroBO | null> {
    try {
      const now = new Date().toISOString();
      const updatedPomodoro = await this.persistenceService.update(pomodoroId, {
        status: 'completed',
        end_time: now
      });

      return this.toBusinessObject(updatedPomodoro);
    } catch (error) {
      console.error('完成番茄钟失败:', error);
      return null;
    }
  }

  static override create<PomodoroData, PomodoroBO extends BusinessObject>(): BaseApiHandler<PomodoroData, PomodoroBO> {
    const persistenceService = new PomodoroPersistenceService();
    return new PomodoroApiHandler(
      persistenceService
    ) as unknown as BaseApiHandler<PomodoroData, PomodoroBO>;
  }
}