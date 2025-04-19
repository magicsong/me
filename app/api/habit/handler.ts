import { BaseApiHandler } from '@/app/api/lib/BaseApiHandler';
import { HabitData, HabitPersistenceService } from '@/lib/persist/habit';
import { HabitBO } from '../types';
import { HabitOutputParser, HabitPromptBuilder } from './ai';

/**
 * 习惯API处理器
 */
export class HabitApiHandler extends BaseApiHandler<HabitData, HabitBO> {
  constructor(
    persistenceService: HabitPersistenceService,
    promptBuilder: HabitPromptBuilder,
    outputParser: HabitOutputParser
  ) {
    super(persistenceService, promptBuilder, outputParser);
  }
  
  getResourceName(): string {
    return 'habit';
  }
  validateBO(businessObject: Partial<HabitBO>, isUpdate: boolean): boolean {
    if (!businessObject) return false;

    // name 是必需的
    if (!businessObject.name || businessObject.name.trim() === '') {
      return false;
    }

    // userId 是必需的
    if (!businessObject.userId) {
      return false;
    }

    // 验证 category 的有效性（如果有提供）
    if (businessObject.category &&
      !['productivity', 'health', 'learning', 'social', 'other'].includes(businessObject.category)) {
      return false;
    }

    // 验证 rewardPoints 的有效性
    if (businessObject.rewardPoints !== undefined &&
      (typeof businessObject.rewardPoints !== 'number' || businessObject.rewardPoints < 0)) {
      return false;
    }

    // 验证 status 的有效性（如果有提供）
    if (businessObject.status &&
      !['active', 'paused', 'archived'].includes(businessObject.status)) {
      return false;
    }

    return true;
  }

  setDefaultsBO(businessObject: Partial<HabitBO>, isUpdate: boolean): Partial<HabitBO> {
    const now = new Date();

    // 设置默认值
    if (!isUpdate) {
      businessObject.createdAt = businessObject.createdAt || now.toISOString();
      businessObject.status = businessObject.status || 'active';
      businessObject.category = businessObject.category || 'productivity';
      businessObject.rewardPoints = businessObject.rewardPoints ?? 1; // 默认1点奖励
    }

    // 根据需要对更新操作进行处理
    if (isUpdate) {
      // 如果要更改状态为archived，可能需要特殊处理
      if (businessObject.status === 'archived') {
        // 根据业务需求添加归档逻辑
      }
    }

    return businessObject;
  }
  protected validateInput(data: Partial<HabitBO>): boolean {
    // 验证必要字段
    if (!data.name || data.name.trim() === '') {
      return false;
    }

    if (!data.userId) {
      return false;
    }

    // 验证奖励点数
    if (data.rewardPoints !== undefined && (isNaN(data.rewardPoints) || data.rewardPoints < 0)) {
      return false;
    }

    return true;
  }

  protected resourceName(): string {
    return 'habit';
  }

  // 暴露持久化服务以便在路由处理中使用
  getPersistenceService(): HabitPersistenceService {
    return this.persistenceService as HabitPersistenceService;
  }

  // 实现业务对象和数据对象转换方法
  toBusinessObject(dataObject: HabitData): HabitBO {
    return {
      id: dataObject.id,
      name: dataObject.name,
      description: dataObject.description ?? undefined,
      frequency: dataObject.frequency,
      createdAt: dataObject.created_at,
      userId: dataObject.user_id,
      category: dataObject.category || 'productivity', // 提供默认值
      rewardPoints: dataObject.reward_points || 0, // 确保有默认值
      status: dataObject.status,
      completedToday: dataObject.completedToday,
      completedTier: dataObject.completedTier,
      challengeTiers: dataObject.challengeTiers,
      streak: dataObject.streak || 0,
    };
  }
  fieldsMoveToExtraOptionsWhenGet(): string[] {
      return ["date"]
  }
  
  toDataObject(businessObject: HabitBO): Partial<HabitData> {
    return {
      id: businessObject.id,
      name: businessObject.name,
      description: businessObject.description,
      frequency: businessObject.frequency,
      created_at: businessObject.createdAt,
      user_id: businessObject.userId,
      category: businessObject.category,
      reward_points: businessObject.rewardPoints || 0, // 确保有默认值
      status: businessObject.status,
      streak: businessObject.streak,
    };
  }

  toBusinessObjects(dataObjects: Habit[]): HabitBO[] {
    return dataObjects.map(dataObject => this.toBusinessObject(dataObject));
  }

  toDataObjects(businessObjects: HabitBO[]): Partial<Habit>[] {
    return businessObjects.map(businessObject => this.toDataObject(businessObject));
  }
}

// 创建API处理器的工厂函数
export function createHabitApiHandler(): HabitApiHandler {
  const persistenceService = new HabitPersistenceService();
  const promptBuilder = new HabitPromptBuilder();
  const outputParser = new HabitOutputParser();

  return new HabitApiHandler(persistenceService, promptBuilder, outputParser);
}
