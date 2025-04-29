import { createSingleResourceRoute } from '../../lib/utils/create-single-resource-route';
import { NoteApiHandler } from '../handler';


// 创建 noteHandler 实例
const noteHandler = NoteApiHandler.create();

export const { GET, POST, PUT, DELETE, PATCH } = createSingleResourceRoute(noteHandler);