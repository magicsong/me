import { NextRequest, NextResponse } from 'next/server';

export type ApiMiddlewareOptions = {
  enableLogging?: boolean;
  transformErrors?: boolean;
};

// 错误代码映射
const ERROR_CODE_MAP: Record<string, { status: number; message: string }> = {
  'auth_required': { status: 401, message: '需要登录' },
  'permission_denied': { status: 403, message: '权限不足' },
  'not_found': { status: 404, message: '资源不存在' },
  'validation_error': { status: 400, message: '数据验证失败' },
  // 可以添加更多错误码映射
};

/**
 * API中间件包装函数 - 用于包装API路由处理器，提供日志记录和错误处理功能
 */
export function withApiMiddleware(
  handler: (req: NextRequest, ...args: any[]) => Promise<NextResponse>,
  options: ApiMiddlewareOptions = { enableLogging: true, transformErrors: true }
) {
  return async (req: NextRequest, ...args: any[]) => {
    const startTime = Date.now();
    const { pathname, searchParams } = req.nextUrl;
    const method = req.method;

    // 请求日志
    if (options.enableLogging) {
      console.log(`👉 ${method} ${pathname}`, 
        searchParams.toString() ? `?${searchParams.toString()}` : '');
    }

    try {
      // 执行原始处理器
      const response = await handler(req, ...args);
      
      // 响应时间日志
      if (options.enableLogging) {
        const duration = Date.now() - startTime;
        console.log(`✅ ${method} ${pathname} - ${response.status} (${duration}ms)`);
      }
      
      return response;
    } catch (error) {
      // 错误日志
      console.error(`❌ ${method} ${pathname} - 错误:`, error);
      
      // 错误转换
      if (options.transformErrors) {
        const errorCode = error.code || 'unknown_error';
        const errorInfo = ERROR_CODE_MAP[errorCode] || { status: 500, message: '服务器内部错误' };
        
        return NextResponse.json(
          { 
            error: errorInfo.message, 
            code: errorCode,
            details: error.message 
          }, 
          { status: errorInfo.status }
        );
      }
      
      // 默认错误响应
      return NextResponse.json(
        { error: '处理请求时发生错误', details: error.message },
        { status: 500 }
      );
    }
  };
}