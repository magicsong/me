import { createSingleResourceRoute } from "../../lib/utils/create-single-resource-route";
import { createHabitApiHandler } from "../handler";

// 创建习惯处理器的实例
const habitHandler = createHabitApiHandler();
export const { GET, POST, PUT, DELETE, PATCH } = createSingleResourceRoute(habitHandler);
