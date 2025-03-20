"use server";

import { revalidatePath } from "next/cache";
import { 
  getHabitsFromDB, 
  getHabitHistoryFromDB, 
  createHabitInDB, 
  deleteHabitFromDB, 
  completeHabitInDB,
  getHabitStatsFromDB
} from "@/lib/db";
import { auth } from "@/auth"; // 导入auth函数，用于获取会话

// 获取习惯列表
export async function getHabits() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("未授权：需要用户登录");
  }
  
  try {
    return await getHabitsFromDB(session.user.id);
  } catch (error) {
    console.error("获取习惯失败:", error);
    throw new Error("获取习惯时出错");
  }
}

// 创建新习惯
export async function createHabit(name: string, description: string, frequency: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("未授权：需要用户登录");
  }
  
  try {
    const habit = await createHabitInDB(name, description, frequency, session.user.id);
    revalidatePath("/dashboard");
    revalidatePath("/habits");
    return habit;
  } catch (error) {
    console.error("创建习惯失败:", error);
    throw new Error("创建习惯时出错");
  }
}

// 删除习惯
export async function deleteHabit(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("未授权：需要用户登录");
  }
  
  try {
    await deleteHabitFromDB(parseInt(id), session.user.id);
    revalidatePath("/dashboard");
    revalidatePath("/habits");
    return { success: true };
  } catch (error) {
    console.error("删除习惯失败:", error);
    throw new Error("删除习惯时出错");
  }
}

// 完成习惯
export async function completeHabit(id: string, completed: boolean = true) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("未授权：需要用户登录");
  }
  
  try {
    const result = await completeHabitInDB(parseInt(id), completed, session.user.id);
    revalidatePath("/dashboard");
    revalidatePath("/habits");
    return { success: true, completed: result };
  } catch (error) {
    console.error("完成习惯失败:", error);
    throw new Error("完成习惯时出错");
  }
}

// 获取习惯历史记录
export async function getHabitHistory(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("未授权：需要用户登录");
  }
  
  try {
    return await getHabitHistoryFromDB(parseInt(id), session.user.id);
  } catch (error) {
    console.error("获取习惯历史记录失败:", error);
    throw new Error("获取习惯历史记录时出错");
  }
}

// 获取习惯统计数据
export async function getHabitStats(timeRange: 'week' | 'month' | 'year' = 'week') {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("未授权：需要用户登录");
  }
  
  try {
    return await getHabitStatsFromDB(session.user.id, timeRange);
  } catch (error) {
    console.error("获取习惯统计数据失败:", error);
    throw new Error("获取习惯统计数据时出错");
  }
}
