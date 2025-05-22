import { and, eq, gte, inArray } from 'drizzle-orm';
import { db } from './pool';
import { global_habit_stats, habit_entries, habit_stats, habits } from './schema';

// 按时间范围获取习惯统计数据
export async function getHabitStatsByTimeRangeFromDB(
  userId: string, 
  timeRange: 'week' | 'month' | 'quarter' | 'year' = 'week'
): Promise<any> {
  // 计算时间范围的开始和结束日期
  const now = new Date();
  let periodStart = new Date();
  let periodLabel = '';
  
  switch(timeRange) {
    case 'week':
      // 设置为本周的第一天（星期一）
      periodStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
      periodLabel = `${periodStart.toLocaleDateString('zh-CN')} 至 ${now.toLocaleDateString('zh-CN')}`;
      break;
    case 'month':
      // 设置为本月的第一天
      periodStart.setDate(1);
      periodLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`;
      break;
    case 'quarter':
      // 设置为本季度的第一天
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      periodStart.setMonth(quarterStartMonth, 1);
      periodLabel = `${now.getFullYear()}年 Q${Math.floor(now.getMonth() / 3) + 1}`;
      break;
    case 'year':
      // 设置为本年的第一天
      periodStart.setMonth(0, 1);
      periodLabel = `${now.getFullYear()}年`;
      break;
  }
  
  // 将时间设置为每天的开始（0:00:00）
  periodStart.setHours(0, 0, 0, 0);
  
  // 尝试从全局统计表获取已缓存的数据
  const cachedStats = await db.select()
    .from(global_habit_stats)
    .where(and(
      eq(global_habit_stats.user_id, userId),
      eq(global_habit_stats.time_range, timeRange),
      eq(global_habit_stats.period_start, periodStart.toISOString())
    ))
    .limit(1);
  
  // 如果有缓存数据且是今天更新的，直接返回
  if (cachedStats.length > 0 && 
      new Date(cachedStats[0].updated_at).toDateString() === now.toDateString()) {
    return await formatStatsResponse(cachedStats[0], periodLabel, userId);
  }
  
  // 没有缓存或缓存已过期，重新计算统计数据
  
  // 1. 获取用户所有习惯
  const userHabits = await db.select()
    .from(habits)
    .where(and(
      eq(habits.user_id, userId),
      eq(habits.status, 'active')
    ));
  
  if (userHabits.length === 0) {
    return {
      overallCompletionRate: 0,
      periodLabel,
      bestHabit: null,
      worstHabit: null,
      habitStats: [],
      dailyTrend: []
    };
  }
  
  // 2. 获取每个习惯在指定时间范围内的打卡记录
  const habitIds = userHabits.map(h => h.id);
  
  const entries = await db.select({
    id: habit_entries.id,
    habit_id: habit_entries.habit_id,
    completed_at: habit_entries.completed_at,
    status: habit_entries.status,
  })
  .from(habit_entries)
  .where(and(
    inArray(habit_entries.habit_id, habitIds),
    eq(habit_entries.user_id, userId),
    gte(habit_entries.completed_at, periodStart.toISOString())
  ));
  
  // 3. 计算每个习惯的统计数据
  const habitStats: Array<{
    id: string;
    name: string;
    completionRate: number;
    streak: number;
    totalCompletions: number;
    missedDays: number;
  }> = [];
  
  let totalCompletions = 0;
  let totalFailed = 0;
  let bestHabit = null;
  let worstHabit = null;
  
  for (const habit of userHabits) {
    // 获取习惯的详细统计数据
    const habitStat = await db.select()
      .from(habit_stats)
      .where(and(
        eq(habit_stats.habit_id, habit.id),
        eq(habit_stats.user_id, userId)
      ))
      .limit(1);
    
    // 筛选该习惯在时间范围内的打卡记录
    const habitEntries = entries.filter(e => e.habit_id === habit.id);
    const successfulEntries = habitEntries.filter(e => e.status !== 'failed');
    const failedEntries = habitEntries.filter(e => e.status === 'failed');
    
    // 计算指定时期内的完成率（考虑习惯的频率和指定的打卡日期）
    const daysSinceStart = Math.floor((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // 根据习惯频率和检查日期计算应该打卡的天数
    let expectedCheckIns = 0;
    
    if (habit.frequency === 'daily') {
      // 过滤出符合打卡日的天数
      for (let i = 0; i < daysSinceStart; i++) {
        const day = new Date(periodStart);
        day.setDate(day.getDate() + i);
        const weekday = day.getDay() === 0 ? 7 : day.getDay(); // 将周日的0转换为7
        
        if (habit.checkin_days && Array.isArray(habit.checkin_days) && habit.checkin_days.includes(weekday)) {
          expectedCheckIns++;
        }
      }
    } else if (habit.frequency === 'weekly') {
      expectedCheckIns = Math.ceil(daysSinceStart / 7);
    } else if (habit.frequency === 'monthly') {
      // 简单处理，如果跨月则+1
      expectedCheckIns = periodStart.getMonth() !== now.getMonth() ? 2 : 1;
    }
    
    const completionRate = expectedCheckIns > 0 
      ? successfulEntries.length / expectedCheckIns 
      : 0;
    
    const stat = {
      id: habit.id.toString(),
      name: habit.name,
      completionRate,
      streak: habitStat.length > 0 ? habitStat[0].current_streak : 0,
      totalCompletions: successfulEntries.length,
      missedDays: expectedCheckIns - successfulEntries.length
    };
    
    habitStats.push(stat);
    totalCompletions += successfulEntries.length;
    totalFailed += failedEntries.length;
    
    // 更新最佳和最差习惯
    if (bestHabit === null || stat.completionRate > bestHabit.completionRate) {
      bestHabit = stat;
    }
    
    if (worstHabit === null || 
        (stat.completionRate < worstHabit.completionRate && expectedCheckIns > 0)) {
      worstHabit = stat;
    }
  }
  
  // 4. 计算每日趋势数据
  const dailyTrend: Array<{date: string; completionRate: number}> = [];
  const allDays = new Set<string>();
  
  // 收集所有有记录的日期
  for (const entry of entries) {
    const date = new Date(entry.completed_at).toISOString().split('T')[0];
    allDays.add(date);
  }
  
  // 对每个日期计算完成率
  for (const dateStr of Array.from(allDays).sort()) {
    const date = new Date(dateStr);
    const dayEntries = entries.filter(e => 
      new Date(e.completed_at).toISOString().split('T')[0] === dateStr
    );
    
    // 根据当天应打卡的习惯计算完成率
    const dayHabits = userHabits.filter(h => {
      if (h.frequency === 'daily') {
        const weekday = date.getDay() === 0 ? 7 : date.getDay();
        return h.checkin_days && Array.isArray(h.checkin_days) && h.checkin_days.includes(weekday);
      }
      return false; // 其他频率的习惯需要更复杂的逻辑
    });
    
    const successfulEntries = dayEntries.filter(e => e.status !== 'failed');
    const completionRate = dayHabits.length > 0 
      ? successfulEntries.length / dayHabits.length 
      : 0;
    
    dailyTrend.push({
      date: date.toLocaleDateString('zh-CN'),
      completionRate
    });
  }
  
  // 5. 计算总体完成率
  const overallCompletionRate = habitStats.length > 0
    ? habitStats.reduce((sum, stat) => sum + stat.completionRate, 0) / habitStats.length
    : 0;
  
  // 6. 构建并保存全局统计数据
  const globalStat = {
    user_id: userId,
    time_range: timeRange,
    period_start: periodStart.toISOString(),
    period_end: now.toISOString(),
    overall_completion_rate: overallCompletionRate,
    total_check_ins: totalCompletions,
    total_failed: totalFailed,
    best_habit_id: bestHabit ? parseInt(bestHabit.id) : null,
    worst_habit_id: worstHabit ? parseInt(worstHabit.id) : null,
    daily_trend: dailyTrend,
    updated_at: now.toISOString()
  };
  
  // 如果有缓存数据则更新，否则创建新记录
  if (cachedStats.length > 0) {
    await db.update(global_habit_stats)
      .set(globalStat)
      .where(eq(global_habit_stats.id, cachedStats[0].id));
  } else {
    await db.insert(global_habit_stats).values(globalStat);
  }
  
  // 7. 返回统计结果
  return {
    overallCompletionRate,
    periodLabel,
    bestHabit,
    worstHabit,
    habitStats,
    dailyTrend
  };
}

// 格式化缓存的统计数据返回结果
async function formatStatsResponse(cachedStat: any, periodLabel: string, userId: string) {
  // 获取最佳和最差习惯的详细信息
  let bestHabit = null;
  let worstHabit = null;
  
  if (cachedStat.best_habit_id) {
    const habit = await db.select()
      .from(habits)
      .where(eq(habits.id, cachedStat.best_habit_id))
      .limit(1);
      
    const habitStat = await db.select()
      .from(habit_stats)
      .where(and(
        eq(habit_stats.habit_id, cachedStat.best_habit_id),
        eq(habit_stats.user_id, userId)
      ))
      .limit(1);
      
    if (habit.length > 0) {
      bestHabit = {
        id: habit[0].id.toString(),
        name: habit[0].name,
        completionRate: 1, // 简化处理，作为最佳习惯可以默认为1
        streak: habitStat.length > 0 ? habitStat[0].current_streak : 0,
        totalCompletions: habitStat.length > 0 ? habitStat[0].total_check_ins : 0,
        missedDays: 0
      };
    }
  }
  
  if (cachedStat.worst_habit_id) {
    const habit = await db.select()
      .from(habits)
      .where(eq(habits.id, cachedStat.worst_habit_id))
      .limit(1);
      
    const habitStat = await db.select()
      .from(habit_stats)
      .where(and(
        eq(habit_stats.habit_id, cachedStat.worst_habit_id),
        eq(habit_stats.user_id, userId)
      ))
      .limit(1);
      
    if (habit.length > 0) {
      worstHabit = {
        id: habit[0].id.toString(),
        name: habit[0].name,
        completionRate: 0, // 简化处理，作为最差习惯可以默认为0
        streak: habitStat.length > 0 ? habitStat[0].current_streak : 0,
        totalCompletions: habitStat.length > 0 ? habitStat[0].total_check_ins : 0,
        missedDays: 10 // 简化处理，给一个默认值
      };
    }
  }
  
  // 获取所有习惯的统计数据
  const userHabits = await db.select()
    .from(habits)
    .where(eq(habits.user_id, userId));
    
  const habitStats = await Promise.all(userHabits.map(async (habit) => {
    const stat = await db.select()
      .from(habit_stats)
      .where(and(
        eq(habit_stats.habit_id, habit.id),
        eq(habit_stats.user_id, userId)
      ))
      .limit(1);
    
    // 简化处理，返回基本统计数据
    return {
      id: habit.id.toString(),
      name: habit.name,
      completionRate: stat.length > 0 ? parseFloat(stat[0].completion_rate.toString()) : 0,
      streak: stat.length > 0 ? stat[0].current_streak : 0,
      totalCompletions: stat.length > 0 ? stat[0].total_check_ins : 0,
      missedDays: 0 // 简化处理
    };
  }));
  
  return {
    overallCompletionRate: parseFloat(cachedStat.overall_completion_rate.toString()),
    periodLabel,
    bestHabit,
    worstHabit,
    habitStats,
    dailyTrend: cachedStat.daily_trend || []
  };
}
