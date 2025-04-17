import { TodoApiHandler } from '../handler';
import { createSingleResourceRoute } from '../../lib/utils/create-single-resource-route';

// 创建 TodoApiHandler 实例
const todoHandler = TodoApiHandler.create();

export const { GET, POST, PUT, DELETE, PATCH } = createSingleResourceRoute(todoHandler);