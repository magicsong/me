import { TagData, TagPersistenceService } from '@/lib/persist/tag';
import { BaseApiHandler } from "../lib/BaseApiHandler";
import { BusinessObject } from '../lib/types';
import { TagBO } from '../types';

export class TagApiHandler extends BaseApiHandler<TagData, TagBO> {
  validateBO(data: TagBO): boolean {
    if (!data) return false;

    // name 是必需的
    if (!data.name || data.name.trim() === '') return false;

    // 颜色是必需的
    if (!data.color) return false;

    // 用户ID是必需的
    if (!data.userId) return false;

    return true;
  }

  setDefaultsBO(businessObject: Partial<TagBO>, isUpdate: boolean): Partial<TagBO> {
    const now = new Date();

    // 设置默认值
    if (!isUpdate) {

      // 设置默认颜色（如果没有提供）
      if (!businessObject.color) {
        businessObject.color = '#3b82f6'; // 默认蓝色
      }
    }
    
    return businessObject;
  }

  getResourceName(): string {
    return 'tag';
  }

  toBusinessObject(dataObject: TagData): TagBO {
    return {
      id: dataObject.id,
      name: dataObject.name,
      color: dataObject.color || '#3b82f6',
      kind: dataObject.kind || undefined,
      userId: dataObject.user_id,
    };
  }

  toDataObject(businessObject: TagBO): Partial<TagData> {
    const result: Partial<TagData> = {
      name: businessObject.name,
      color: businessObject.color,
      user_id: businessObject.userId,
    };
    
    if (businessObject.kind) {
      result["kind"] = businessObject.kind;
    }
    
    if (businessObject.id && businessObject.id > 0) {
      result["id"] = businessObject.id;
    }
    return result;
  }

  toBusinessObjects(dataObjects: TagData[]): TagBO[] {
    return dataObjects.map(data => this.toBusinessObject(data));
  }

  toDataObjects(businessObjects: TagBO[]): Partial<TagData>[] {
    return businessObjects.map(bo => this.toDataObject(bo));
  }

  /**
   * 根据用户ID获取标签
   */
  async getUserTags(userId: string, kind?: string): Promise<TagBO[]> {
    try {
      const options = kind ? { kind } : {};
      const tags = await (this.persistenceService as TagPersistenceService).findByUserId(userId, options);
      return this.toBusinessObjects(tags);
    } catch (error) {
      console.error('获取用户标签失败:', error);
      return [];
    }
  }

  /**
   * 搜索标签
   */
  async searchTags(userId: string, searchTerm: string, kind?: string): Promise<TagBO[]> {
    try {
      const tags = await (this.persistenceService as TagPersistenceService).searchTags(userId, searchTerm, kind);
      return this.toBusinessObjects(tags);
    } catch (error) {
      console.error('搜索标签失败:', error);
      return [];
    }
  }

  /**
   * 创建标签（如果不存在）
   */
  async createIfNotExists(tagData: Partial<TagBO>): Promise<TagBO | null> {
    try {
      if (!this.validateBO(tagData as TagBO)) {
        throw new Error('标签数据无效');
      }

      const dataObject = this.toDataObject(tagData as TagBO);
      const tag = await (this.persistenceService as TagPersistenceService).createIfNotExists(dataObject as any);
      return this.toBusinessObject(tag);
    } catch (error) {
      console.error('创建标签失败:', error);
      return null;
    }
  }

  static override create<TagData, TagBO extends BusinessObject>(): BaseApiHandler<TagData, TagBO> {
    const persistenceService = new TagPersistenceService();
    return new TagApiHandler(
      persistenceService
    ) as unknown as BaseApiHandler<TagData, TagBO>;
  }
}
