import { TodoApiHandler } from './handler';
import { createNextRouteHandlers } from '../lib/utils/nextjs-route-handlers';

// 创建 TodoApiHandler 实例
const todoHandler = TodoApiHandler.create();

export const { GET, POST, PUT, DELETE, PATCH } = createNextRouteHandlers(todoHandler);