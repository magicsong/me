import { NoteApiHandler } from './handler';
import { createNextRouteHandlers } from '../lib/utils/nextjs-route-handlers';

// 创建 noteHandler 实例
const noteHandler = NoteApiHandler.create();

export const { GET, POST, PUT, DELETE, PATCH } = createNextRouteHandlers(noteHandler);