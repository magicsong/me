import { PomodoroApiHandler } from './handler';
import { createNextRouteHandlers } from '../lib/utils/nextjs-route-handlers';

// 创建 pomodoroHandler 实例
const pomodoroHandler = PomodoroApiHandler.create();

export const { GET, POST, PUT, DELETE, PATCH } = createNextRouteHandlers(pomodoroHandler);