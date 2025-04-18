import { OutputParser } from '../types';
import { trimLLMContentToJsonArray, trimLLMContentToJsonObject } from '@/lib/utils';

/**
 * 默认的JSON输出解析器
 * 将LLM输出转为JSON，然后强制转为泛型T类型
 */
export class JsonOutputParser<T> implements OutputParser<T> {
  /**
   * 解析创建操作的输出
   * @param output LLM生成的输出文本
   * @returns 解析后的对象，类型为Partial<T>
   */
  parseCreateOutput(output: string): Partial<T> {
    return this.extractJson(output);
  }

  /**
   * 解析更新操作的输出
   * @param output LLM生成的输出文本
   * @param existingData 已存在的数据对象
   * @returns 解析后的对象，类型为Partial<T>
   */
  parseUpdateOutput(output: string, existingData: T): Partial<T> {
    const parsed = this.extractJson(output);
    return { ...parsed };
  }

  /**
   * 通用解析方法，直接提取JSON并转换为T类型
   * @param output LLM生成的输出文本
   * @returns 解析后的对象，类型为Partial<T>
   */
  parse(output: string): Partial<T> {
    return this.extractJson(output);
  }

  /**
   * 批量创建操作的数组输出解析
   * @param output LLM生成的输出文本
   * @returns 解析后的对象数组，类型为Partial<T>[]
   */
  parseCreateOutputArray(output: string): Partial<T>[] {
    return this.extractJsonArray(output);
  }

  /**
   * 批量更新操作的数组输出解析
   * @param output LLM生成的输出文本
   * @param existingDataArray 已存在的数据对象数组
   * @returns 解析后的对象数组，类型为Partial<T>[]
   */
  parseUpdateOutputArray(output: string, existingDataArray: T[]): Partial<T>[] {
    const parsedArray = this.extractJsonArray(output);
    
    // 如果解析出的数组长度与现有数据长度不匹配，直接返回解析结果
    if (parsedArray.length !== existingDataArray.length) {
      return parsedArray;
    }
    
    // 否则将解析结果与现有数据合并
    return parsedArray.map((item, index) => {
      return { ...item };
    });
  }

  /**
   * 通用数组解析方法
   * @param output LLM生成的输出文本
   * @returns 解析后的对象数组，类型为Partial<T>[]
   */
  parseArray(output: string): Partial<T>[] {
    return this.extractJsonArray(output);
  }

  /**
   * 从文本中提取JSON对象
   * @param text 包含JSON的文本
   * @returns 解析后的JSON对象
   */
  private extractJson(text: string): Partial<T> {
    try {
      const jsonString = trimLLMContentToJsonObject(text);
      return JSON.parse(jsonString) as Partial<T>;
    } catch (e) {
      console.error('JSON解析失败:', e);
      console.debug('原始文本:', text);
      return {} as Partial<T>;
    }
  }

  /**
   * 从文本中提取JSON数组
   * @param text 包含JSON数组的文本
   * @returns 解析后的JSON对象数组
   */
  private extractJsonArray(text: string): Partial<T>[] {
    try {
      // 尝试从文本中提取JSON数组
      const jsonString = trimLLMContentToJsonArray(text);
      
      // 尝试解析为数组
      const parsedData = JSON.parse(jsonString);
      
      // 验证解析出的是否为数组
      if (Array.isArray(parsedData)) {
        return parsedData as Partial<T>[];
      }
      
      // 如果不是数组但是对象，则包装为数组返回
      if (typeof parsedData === 'object' && parsedData !== null) {
        return [parsedData] as Partial<T>[];
      }
      
      console.warn('提取的JSON不是数组或对象:', parsedData);
      return [];
      
    } catch (e) {
      // 如果提取数组失败，尝试提取单个对象并包装为数组
      try {
        const singleObject = this.extractJson(text);
        if (Object.keys(singleObject).length > 0) {
          return [singleObject];
        }
      } catch {} // 忽略嵌套错误
      
      console.error('JSON数组解析失败:', e);
      console.debug('原始文本:', text);
      return [];
    }
  }
}
