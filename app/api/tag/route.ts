import { TagApiHandler } from './handler';
import { createNextRouteHandlers } from '../lib/utils/nextjs-route-handlers';

// 创建 tagHandler 实例
const tagHandler = TagApiHandler.create();

export const { GET, POST, PUT, DELETE, PATCH } = createNextRouteHandlers(tagHandler);
