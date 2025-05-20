import { NextRequest, NextResponse } from 'next/server';
import { IApiHandler } from '../interfaces/IApiHandler';
import { BaseBatchRequest, BaseRequest, BatchPatchRequest, BusinessObject, FilterOptions, PatchRequest } from '../types';
import { getCurrentUserId } from '@/lib/utils';

/**
 * 创建标准API响应
 */
function createApiResponse(success: boolean, data?: any, error?: string, status: number = 200) {
  const response: { success: boolean; data?: any; error?: string } = { success };

  if (data !== undefined) {
    if (data && typeof data === 'object' && 'items' in data) {
      // 如果data包含items字段，将items作为response.data
      response.data = data.items;

      // 将data中除了items以外的其他字段放在response根级别
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'items') {
          response[key] = value;
        }
      });
    } else {
      // 保持原有行为
      response.data = data;
    }
  }

  if (error) {
    response.error = error;
  }

  return NextResponse.json(response, { status });
}

/**
 * 将URL查询参数转换为过滤器对象
 * 支持的运算符: _gte, _lte, _gt, _lt, _ne, _in, _nin, _regex
 */
function parseQueryParams(searchParams: URLSearchParams): FilterOptions {
  const filterOptions: FilterOptions = { conditions: [] };
  const operatorRegex = /^(.+)_(gte|lte|gt|lt|ne|in|nin|regex)$/;

  // 处理特殊参数
  if (searchParams.has('sortBy')) {
    filterOptions.sortBy = searchParams.get('sortBy') || undefined;
  }

  if (searchParams.has('sortDirection')) {
    const direction = searchParams.get('sortDirection');
    if (direction === 'asc' || direction === 'desc') {
      filterOptions.sortDirection = direction;
    }
  }

  if (searchParams.has('limit')) {
    const limit = parseInt(searchParams.get('limit') || '0');
    if (!isNaN(limit) && limit > 0) {
      filterOptions.limit = limit;
    }
  }

  if (searchParams.has('offset')) {
    const offset = parseInt(searchParams.get('offset') || '0');
    if (!isNaN(offset) && offset >= 0) {
      filterOptions.offset = offset;
    }
  }

  // 映射运算符到FilterOperator类型
  const operatorMap = {
    'gte': 'gte',
    'lte': 'lte',
    'gt': 'gt',
    'lt': 'lt',
    'ne': 'neq',
    'in': 'in',
    'nin': 'neq', // 处理为neq+数组值
    'regex': 'like'
  };

  // 处理所有查询参数
  searchParams.forEach((value, key) => {
    // 跳过特定的参数和已处理的特殊参数
    if (['id', 'page', 'pageSize', 'userId', 'filters', 'sortBy', 'sortDirection', 'limit', 'offset'].includes(key)) {
      return;
    }

    // 检查是否包含运算符
    const operatorMatch = key.match(operatorRegex);
    if (operatorMatch) {
      const [, fieldName, operator] = operatorMatch;

      // 映射到支持的运算符
      const mappedOperator = operatorMap[operator] as FilterOperator;
      if (!mappedOperator) return;

      let processedValue: any = value;

      // 根据运算符处理值类型
      switch (operator) {
        case 'in':
        case 'nin':
          // 数组类型运算符
          try {
            const arrayValue = JSON.parse(value);
            if (Array.isArray(arrayValue)) {
              processedValue = arrayValue;
            } else {
              processedValue = [value]; // 单值作为数组
            }
          } catch (e) {
            // 解析失败时，将值作为单元素数组
            processedValue = [value];
          }
          break;

        case 'regex':
          // 正则表达式 - 转为like操作
          processedValue = value;
          break;

        case 'gte':
        case 'lte':
        case 'gt':
        case 'lt':
        case 'ne':
          // 数值或日期比较运算符
          if (!isNaN(Number(value)) && value.trim() !== '') {
            // 数值类型
            processedValue = Number(value);
          } else if (value === 'true' || value === 'false') {
            // 布尔类型
            processedValue = value === 'true';
          }
          break;
      }

      // 添加到条件数组
      filterOptions.conditions!.push({
        field: fieldName,
        operator: mappedOperator,
        value: processedValue
      });
    } else {
      // 处理没有运算符的普通参数 (默认为eq操作符)
      let processedValue = value;

      if (value === 'true') {
        processedValue = true;
      } else if (value === 'false') {
        processedValue = false;
      }
      // 处理数字参数
      else if (!isNaN(Number(value)) && value.trim() !== '') {
        processedValue = Number(value);
      }

      // 添加到条件数组
      filterOptions.conditions!.push({
        field: key,
        operator: 'eq',
        value: processedValue
      });
    }
  });

  return filterOptions;
}

/**
 * NextJS路由处理器生成器 - 基于IApiHandler自动生成NextJS API路由
 */
export function createNextRouteHandlers<T, BO extends BusinessObject>(handler: IApiHandler<T, BO>) {

  /**
   * 处理GET请求 - 支持多种获取资源方式
   */
  async function GET(request: NextRequest) {
    try {
      const userId = await getCurrentUserId();
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      const page = searchParams.has('page') ? parseInt(searchParams.get('page') as string) : undefined;
      const pageSize = searchParams.has('pageSize') ? parseInt(searchParams.get('pageSize') as string) : undefined;

      // 使用从身份验证获取的userId，而不是从参数中获取
      const userIdFromParam = searchParams.get('userId') || undefined;
      const effectiveUserId = userId || userIdFromParam;

      // 解析URL中的所有查询参数作为一般过滤条件
      let queryFilters = parseQueryParams(searchParams);
      // 判断是否有除id/page/pageSize/userId之外的过滤参数
      const hasFilters = Object.keys(queryFilters).length > 0;

      // 根据参数决定调用哪个获取方法
      if (id) {
        // 获取单个资源
        const result = await handler.getById(id);
        if (!result) {
          return createApiResponse(false, undefined, '资源不存在', 404);
        }
        return createApiResponse(true, result);
      } else if (hasFilters && page !== undefined) {
        // 分页过滤获取
        const result = await handler.getPageWithFilters(queryFilters, page, pageSize, effectiveUserId);
        return createApiResponse(true, result);
      } else if (hasFilters) {
        // 过滤获取
        const result = await handler.getWithFilters(queryFilters, effectiveUserId);
        return createApiResponse(true, result);
      } else if (page !== undefined) {
        // 分页获取
        const result = await handler.getPage(page, pageSize, effectiveUserId);
        return createApiResponse(true, result);
      } else {
        // 获取所有资源
        const result = await handler.getAll(effectiveUserId);
        return createApiResponse(true, result);
      }
    } catch (error) {
      console.error('GET请求处理错误:', error);
      return createApiResponse(false, undefined, '处理请求时发生错误', 500);
    }
  }

  /**
   * 处理POST请求 - 创建资源或使用AI生成
   */
  async function POST(request: NextRequest) {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        return createApiResponse(false, undefined, '用户未登录', 401);
      }

      const body = await request.json();
      const { isAIGeneration, isBatch, ...rest } = body;
      let myRequest: BaseRequest<BO> | BaseBatchRequest<BO> = rest;
      myRequest.userId = userId;
      if (rest.data && typeof rest.data === 'object') {
        myRequest.data.userId = userId;
      }
      if (!rest.data) {
        console.log('没有data字段，使用默认数据');
        myRequest.data = { ...rest, userId };
      }

      if (isAIGeneration) {
        if (isBatch) {
          // AI批量生成
          const response = await handler.generateBatchWithAI(myRequest as BaseRequest<Partial<BO>>);
          return createApiResponse(true, response.data, response.error, response.success ? 200 : 400);
        } else {
          // AI单个生成
          const response = await handler.generateWithAI(myRequest as BaseRequest<Partial<BO>>);
          return createApiResponse(true, response.data, response.error, response.success ? 200 : 400);
        }
      } else {
        // 普通创建
        if (isBatch) {
          // 批量创建
          const response = await handler.handleBatchCreate(myRequest as BaseBatchRequest<BO>);
          return createApiResponse(true, response.data, response.error, response.success ? 201 : 400);
        }
        const response = await handler.handleCreate(myRequest as BaseRequest<BO>);
        return createApiResponse(true, response.data, response.error, response.success ? 200 : 400);
      }
    } catch (error) {
      console.error('POST请求处理错误:', error);
      return createApiResponse(false, undefined, '处理请求时发生错误', 500);
    }
  }

  /**
   * 处理单个资源更新
   */
  async function handleSingleUpdate(data: BaseRequest<BO>) {
    const response = await handler.handleUpdate(data);
    return createApiResponse(response.success, response.data, response.error);
  }

  /**
   * 处理批量资源更新
   */
  async function handleBatchUpdate(data: any) {
    const response = await handler.handleBatchUpdate(data);
    return createApiResponse(response.success, response.data, response.error);
  }

  /**
   * 处理PUT请求 - 更新资源
   */
  async function PUT(request: NextRequest) {
    try {
      const userId = await getCurrentUserId();
      const body = await request.json();
      const { isBatch, ...data } = body;

      // 将userId注入到请求数据中
      const dataWithUserId = { ...data, userId };

      if (isBatch) {
        return handleBatchUpdate(dataWithUserId);
      } else {
        return handleSingleUpdate(dataWithUserId as BaseRequest<BO>);
      }
    } catch (error) {
      console.error('PUT请求处理错误:', error);
      return createApiResponse(false, undefined, '处理请求时发生错误', 500);
    }
  }

  /**
   * 处理单个资源的部分更新
   */
  async function handleSinglePatch(data: PatchRequest<BO>) {
    const response = await handler.handlePatch(data);
    return createApiResponse(response.success, response.data, response.error);
  }

  /**
   * 处理批量资源的部分更新
   */
  async function handleBatchPatch(data: BatchPatchRequest<BO>) {
    const response = await handler.handleBatchPatch(data);
    return createApiResponse(response.success, response.data, response.error);
  }

  /**
   * 处理PATCH请求 - 部分更新资源
   */
  async function PATCH(request: NextRequest) {
    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        return createApiResponse(false, undefined, '用户未登录', 401);
      }
      const body = await request.json();
      const { ...data } = body;

      // 将userId注入到请求数据中
      const dataWithUserId = { ...data, userId };
      return handleBatchPatch(dataWithUserId as BatchPatchRequest<BO>);
    } catch (error) {
      console.error('PATCH请求处理错误:', error);
      return createApiResponse(false, undefined, '处理请求时发生错误', 500);
    }
  }

  /**
   * 处理单个资源删除
   */
  async function handleSingleDelete(id: string, additionalData: any = {}) {
    const response = await handler.handleDelete({ id, ...additionalData });
    return createApiResponse(response.success, response.data, response.error);
  }

  /**
   * 处理批量资源删除
   */
  async function handleBatchDelete(ids: string[], additionalData: any = {}) {
    const response = await handler.handleBatchDelete({ ids, ...additionalData });
    return createApiResponse(response.success, response.data, response.error);
  }

  /**
   * 处理DELETE请求 - 删除资源
   */
  async function DELETE(request: NextRequest) {
    try {
      const userId = await getCurrentUserId();
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');

      // 支持批量删除
      const idsParam = searchParams.get('ids');
      let ids: string[] = [];

      if (idsParam) {
        try {
          ids = JSON.parse(idsParam);
          if (!Array.isArray(ids)) {
            return createApiResponse(false, undefined, '无效的ids参数，必须是字符串数组', 400);
          }
        } catch (e) {
          return createApiResponse(false, undefined, '无效的ids参数', 400);
        }
      }

      // 尝试从请求体中读取更多信息
      let body = {};
      try {
        body = await request.json();
      } catch (e) {
        // 如果没有请求体，忽略错误
      }

      // 注入用户ID到附加数据
      const bodyWithUserId = { ...body, userId };

      if (ids.length > 0) {
        return handleBatchDelete(ids, bodyWithUserId);
      } else if (id) {
        return handleSingleDelete(id, bodyWithUserId);
      } else {
        return createApiResponse(false, undefined, '缺少必要的id或ids参数', 400);
      }
    } catch (error) {
      console.error('DELETE请求处理错误:', error);
      return createApiResponse(false, undefined, '处理请求时发生错误', 500);
    }
  }

  // 返回所有路由处理函数
  return {
    GET,
    POST,
    PUT,
    PATCH,
    DELETE
  };
}
