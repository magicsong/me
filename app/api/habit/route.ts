import { createNextRouteHandlers } from '../lib/utils/nextjs-route-handlers';
import { createHabitApiHandler } from './handler';

// 创建习惯处理器的实例
const habitHandler = createHabitApiHandler();
export const { GET, POST, PUT, DELETE, PATCH } = createNextRouteHandlers(habitHandler);
