import { NextRequest, NextResponse } from 'next/server';
import { IApiHandler } from '../interfaces/IApiHandler';
import { BaseRequest, BaseResponse, BusinessObject, FilterOptions, PatchRequest } from '../types';

/**
 * 创建标准API响应
 */
function createApiResponse(success: boolean, data?: any, error?: string, status: number = 200) {
  const response: { success: boolean; data?: any; error?: string } = { success };
  
  if (data !== undefined) {
    response.data = data;
  }
  
  if (error) {
    response.error = error;
  }
  
  return NextResponse.json(response, { status });
}

/**
 * 为单个资源类型创建NextJS API路由
 * @param resourceName 资源名称
 * @param handler 资源的API处理器
 * @returns 返回包含所有HTTP方法处理函数的对象
 */
export function createSingleResourceRoute<T, BO extends BusinessObject>(
  handler: IApiHandler<T, BO>
) {
  const resourceName = handler.getResourceName();
  /**
   * 获取单个资源
   */
  async function getResource(id: string) {
    const result = await handler.getById(id);
    if (!result) {
      return createApiResponse(false, undefined, `${resourceName} 不存在`, 404);
    }
    return createApiResponse(true, result);
  }

  /**
   * 创建单个资源
   */
  async function createResource(data: BaseRequest<BO>) {
    const response = await handler.handleCreate(data);
    return createApiResponse(response.success, response.data, response.error, response.success ? 201 : 400);
  }

  /**
   * 使用AI生成单个资源
   */
  async function generateResourceWithAI(data: BaseRequest<Partial<BO>>) {
    const response = await handler.generateWithAI(data);
    return createApiResponse(response.success, response.data, response.error);
  }

  /**
   * 更新单个资源
   */
  async function updateResource(data: BaseRequest<BO>) {
    const response = await handler.handleUpdate(data);
    return createApiResponse(response.success, response.data, response.error);
  }

  /**
   * 部分更新单个资源
   */
  async function patchResource(data: PatchRequest<BO>) {
    const response = await handler.handlePatch(data);
    return createApiResponse(response.success, response.data, response.error);
  }

  /**
   * 删除单个资源
   */
  async function deleteResource(id: string, additionalData: any = {}) {
    const response = await handler.handleDelete({ id, ...additionalData });
    return createApiResponse(response.success, response.data, response.error);
  }

  /**
   * 处理GET请求 - 获取单个资源
   */
  async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const { id } = await params;
      return await getResource(id);
    } catch (error) {
      console.error(`GET ${resourceName} 错误:`, error);
      return createApiResponse(false, undefined, '处理请求时发生错误', 500);
    }
  }

  /**
   * 处理POST请求 - 创建单个资源或使用AI生成
   */
  async function POST(request: NextRequest) {
    try {
      const body = await request.json();
      const { isAIGeneration, ...data } = body;

      if (isAIGeneration) {
        return await generateResourceWithAI(data);
      } else {
        return await createResource(data);
      }
    } catch (error) {
      console.error(`POST ${resourceName} 错误:`, error);
      return createApiResponse(false, undefined, '处理请求时发生错误', 500);
    }
  }

  /**
   * 处理PUT请求 - 完全更新单个资源
   */
  async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const { id } = await params;
      const body = await request.json();
      
      // 确保请求体中包含ID
      const data = { ...body, id };
      
      return await updateResource(data);
    } catch (error) {
      console.error(`PUT ${resourceName} 错误:`, error);
      return createApiResponse(false, undefined, '处理请求时发生错误', 500);
    }
  }

  /**
   * 处理PATCH请求 - 部分更新单个资源
   */
  async function PATCH(request: NextRequest, { params }: { params:  Promise<{ id: string }> }) {
    try {
      const { id } = await params;
      const body = await request.json();
      
      // 确保请求体中包含ID
      const data = { ...body, id };
      
      return await patchResource(data);
    } catch (error) {
      console.error(`PATCH ${resourceName} 错误:`, error);
      return createApiResponse(false, undefined, '处理请求时发生错误', 500);
    }
  }

  /**
   * 处理DELETE请求 - 删除单个资源
   */
  async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
      const { id } = await params;
      
      // 尝试从请求体中读取更多信息
      let body = {};
      try {
        body = await request.json();
      } catch (e) {
        // 如果没有请求体，忽略错误
      }
      
      return await deleteResource(id, body);
    } catch (error) {
      console.error(`DELETE ${resourceName} 错误:`, error);
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
