import { PomodoroApiHandler } from '../handler';
import { createSingleResourceRoute } from '../../lib/utils/create-single-resource-route';

// 创建 TodoApiHandler 实例
const handler = PomodoroApiHandler.create();

export const { GET, POST, PUT, DELETE, PATCH } = createSingleResourceRoute(handler);