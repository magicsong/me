#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
习惯打卡数据统计服务

基于已有的TypeScript实现，提供Python版本的习惯打卡统计功能，
并将统计结果存储到数据库中。
"""

import os
import datetime
from datetime import timedelta
from typing import Dict, List, Optional, Any, Tuple
import logging
from psycopg2.extras import RealDictCursor
import pandas as pd
from db import db

logger = logging.getLogger(__name__)
class HabitStatsService:
    """习惯打卡数据统计服务"""

    def __init__(self):
        """初始化数据库连接"""
        # 使用全局数据库实例
        self.db = db
        
    def _get_connection(self):
        """获取数据库连接"""
        return self.db.get_connection()

    def _ensure_stats_table(self):
        """确保habit_stats表存在，不存在则创建"""
        with self._get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS habit_stats (
                    id SERIAL PRIMARY KEY,
                    habit_id INTEGER NOT NULL,
                    user_id TEXT NOT NULL,
                    total_check_ins INTEGER NOT NULL,
                    current_streak INTEGER NOT NULL,
                    longest_streak INTEGER NOT NULL,
                    completion_rate NUMERIC(5,2) NOT NULL,
                    last_check_in_date DATE,
                    failed_count INTEGER NOT NULL,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(habit_id, user_id)
                )
                """)
                conn.commit()

    def _ensure_global_stats_table(self):
        """确保global_habit_stats表存在，不存在则创建"""
        with self._get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS global_habit_stats (
                    id SERIAL PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    time_range TEXT NOT NULL,
                    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
                    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
                    overall_completion_rate NUMERIC(5,2) NOT NULL,
                    total_check_ins INTEGER NOT NULL,
                    total_failed INTEGER NOT NULL,
                    best_habit_id INTEGER REFERENCES habits(id),
                    worst_habit_id INTEGER REFERENCES habits(id),
                    daily_trend JSONB DEFAULT '[]',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, time_range, period_start)
                )
                """)
                conn.commit()

    def get_entries_by_habit_id(self, habit_id: int, user_id: str) -> List[Dict]:
        """获取习惯的所有打卡记录"""
        with self._get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    """
                    SELECT * FROM habit_entries
                    WHERE habit_id = %s AND user_id = %s
                    ORDER BY completed_at DESC
                    """,
                    (habit_id, user_id)
                )
                return cursor.fetchall()

    def calculate_check_in_stats(self, habit_id: int, user_id: str, time_range: str = 'week') -> Dict[str, Any]:
        """
        计算打卡统计数据
        
        参数:
            habit_id: 习惯ID
            user_id: 用户ID
            time_range: 时间范围，可选值：'week', 'month', 'quarter', 'year'
            
        返回:
            包含统计数据的字典
        """
        # 获取所有打卡记录
        entries = self.get_entries_by_habit_id(habit_id, user_id)
        
        # 按日期分组（去重）
        check_ins_by_date = {}
        failed_count = 0
        
        for entry in entries:
            if entry.get('status') == 'failed':
                failed_count += 1
                continue
            
            # 格式化日期为yyyy-MM-dd格式
            completed_at = entry['completed_at']
            if isinstance(completed_at, str):
                completed_at = datetime.datetime.fromisoformat(completed_at.replace('Z', '+00:00'))
            
            date_str = completed_at.strftime('%Y-%m-%d')
            
            if date_str not in check_ins_by_date:
                check_ins_by_date[date_str] = []
            
            check_ins_by_date[date_str].append(entry)
        
        # 按日期排序（降序）
        unique_dates = sorted(check_ins_by_date.keys(), 
                             key=lambda x: datetime.datetime.strptime(x, '%Y-%m-%d'), 
                             reverse=True)
        
        # 总打卡次数
        total_check_ins = len(unique_dates)
        
        # 计算当前连续打卡天数
        current_streak = 0
        current_date = datetime.datetime.now().date()
        
        while True:
            date_str = current_date.strftime('%Y-%m-%d')
            if date_str in check_ins_by_date:
                current_streak += 1
                current_date -= timedelta(days=1)
            else:
                break
        
        # 计算最长连续打卡天数
        longest_streak = 0
        current_streak_count = 0
        previous_date = None
        
        # 按日期升序排列计算连续天数
        for date_str in sorted(unique_dates, 
                             key=lambda x: datetime.datetime.strptime(x, '%Y-%m-%d')):
            current_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
            
            if previous_date is None:
                current_streak_count = 1
            else:
                diff_days = (current_date - previous_date).days
                
                if diff_days == 1:
                    current_streak_count += 1
                else:
                    current_streak_count = 1
            
            if current_streak_count > longest_streak:
                longest_streak = current_streak_count
            
            previous_date = current_date
        
        # 计算完成率（根据指定的时间范围）
        now = datetime.datetime.now()
        period_start = datetime.datetime.now()
        
        # 根据time_range设置时间范围
        if time_range == 'week':
            # 设置为本周的第一天（星期一）
            days_to_monday = period_start.weekday()
            period_start = period_start - timedelta(days=days_to_monday)
            days_in_period = (now - period_start).days + 1
        elif time_range == 'month':
            # 设置为本月的第一天
            period_start = period_start.replace(day=1)
            days_in_period = (now - period_start).days + 1
        elif time_range == 'quarter':
            # 设置为本季度的第一天
            quarter_start_month = (now.month - 1) // 3 * 3 + 1
            period_start = period_start.replace(month=quarter_start_month, day=1)
            days_in_period = (now - period_start).days + 1
        elif time_range == 'year':
            # 设置为本年的第一天
            period_start = period_start.replace(month=1, day=1)
            days_in_period = (now - period_start).days + 1
        else:
            # 默认使用30天
            period_start = now - timedelta(days=30)
            days_in_period = 30
        
        # 将时间设置为每天的开始（0:00:00）
        period_start = period_start.replace(hour=0, minute=0, second=0, microsecond=0)
        
        check_ins_in_period = 0
        for date_str in unique_dates:
            date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
            if date >= period_start.date():
                check_ins_in_period += 1
        
        completion_rate = (check_ins_in_period / days_in_period) * 100 if days_in_period > 0 else 0
        
        # 最后打卡日期
        last_check_in_date = None
        if unique_dates:
            last_check_in_date = datetime.datetime.strptime(unique_dates[0], '%Y-%m-%d').date()
        
        return {
            "total_check_ins": total_check_ins,
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "completion_rate": completion_rate,
            "last_check_in_date": last_check_in_date,
            "failed_count": failed_count
        }
    
    def save_stats_to_db(self, habit_id: int, user_id: str, stats: Dict[str, Any]) -> None:
        """保存统计数据到数据库"""
        self._ensure_stats_table()
        
        with self._get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("""
                INSERT INTO habit_stats 
                    (habit_id, user_id, total_check_ins, current_streak, longest_streak, 
                     completion_rate, last_check_in_date, failed_count, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (habit_id, user_id) 
                DO UPDATE SET 
                    total_check_ins = EXCLUDED.total_check_ins,
                    current_streak = EXCLUDED.current_streak, 
                    longest_streak = EXCLUDED.longest_streak,
                    completion_rate = EXCLUDED.completion_rate,
                    last_check_in_date = EXCLUDED.last_check_in_date,
                    failed_count = EXCLUDED.failed_count,
                    updated_at = CURRENT_TIMESTAMP
                """, (
                    habit_id,
                    user_id,
                    stats["total_check_ins"],
                    stats["current_streak"],
                    stats["longest_streak"],
                    stats["completion_rate"],
                    stats["last_check_in_date"],
                    stats["failed_count"]
                ))
                conn.commit()
    
    def update_all_user_stats(self, user_id: Optional[str] = None) -> int:
        """
        更新用户所有习惯的统计数据
    
        参数:
            user_id: 用户ID，如果为None则处理所有用户
    
        返回:
            更新的习惯数量
        """
        print("DEBUG: 开始执行update_all_user_stats函数")  # 调试点1
        try:
            total_updated = 0
        
            # 如果指定了用户ID，则只处理该用户
            if user_id:
                print(f"DEBUG: 使用指定的user_id={user_id}")  # 调试点2.1
                with self._get_connection() as conn:
                    with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                        print("DEBUG: 准备执行SQL查询")  # 调试点4
                        cursor.execute(
                            """
                            SELECT id FROM habits
                            WHERE user_id = %s
                            """,
                            (user_id,)
                        )
                        habits = cursor.fetchall()
                        print(f"DEBUG: SQL执行完成，获取到用户 {user_id} 的 {len(habits)} 条记录")  # 调试点5
                
                # 计算每个习惯的统计数据并保存
                for habit in habits:
                    habit_id = habit['id']
                    stats = self.calculate_check_in_stats(habit_id, user_id)
                    self.save_stats_to_db(habit_id, user_id, stats)
                    total_updated += 1
                
                print(f"用户 {user_id} 的习惯数量: {len(habits)}，已更新 {total_updated} 个")
                return total_updated
            else:
                # 获取所有用户列表
                print("DEBUG: 未指定用户ID，处理所有用户")  # 调试点2.2
                with self._get_connection() as conn:
                    with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                        print("DEBUG: 准备查询所有用户")  # 调试点3
                        cursor.execute(
                            """
                            SELECT DISTINCT user_id FROM habits
                            """
                        )
                        users = cursor.fetchall()
                        print(f"DEBUG: 总共找到 {len(users)} 个用户")  # 调试点4
            
                # 为每个用户更新习惯统计
                for user in users:
                    current_user_id = user['user_id']
                    print(f"DEBUG: 处理用户 {current_user_id}")
                    with self._get_connection() as conn:
                        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                            cursor.execute(
                                """
                                SELECT id FROM habits
                                WHERE user_id = %s
                                """,
                                (current_user_id,)
                            )
                            habits = cursor.fetchall()
                            print(f"DEBUG: 用户 {current_user_id} 有 {len(habits)} 个习惯")
                
                # 计算每个习惯的统计数据并保存
                for habit in habits:
                    habit_id = habit['id']
                    stats = self.calculate_check_in_stats(habit_id, current_user_id)
                    self.save_stats_to_db(habit_id, current_user_id, stats)
                    total_updated += 1
                
            print(f"总共更新了 {total_updated} 个习惯的统计数据，涉及 {len(users)} 个用户")
            return total_updated
            
        except Exception as e:
            print(f"ERROR: update_all_user_stats 执行出错: {e}")  # 调试点6
            raise
            
    def get_habit_stats(self, habit_id: int, user_id: str) -> Dict[str, Any]:
        """获取习惯统计数据，如果不存在则计算并保存"""
        self._ensure_stats_table()
        
        with self._get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    """
                    SELECT * FROM habit_stats
                    WHERE habit_id = %s AND user_id = %s
                    """,
                    (habit_id, user_id)
                )
                result = cursor.fetchone()
                
                if not result:
                    # 如果没有统计数据，计算并保存
                    stats = self.calculate_check_in_stats(habit_id, user_id)
                    self.save_stats_to_db(habit_id, user_id, stats)
                    
                    # 重新获取
                    cursor.execute(
                        """
                        SELECT * FROM habit_stats
                        WHERE habit_id = %s AND user_id = %s
                        """,
                        (habit_id, user_id)
                    )
                    result = cursor.fetchone()
                
        return dict(result) if result else {}
    
    def get_all_user_stats(self, user_id: str) -> List[Dict[str, Any]]:
        """获取用户所有习惯的统计数据"""
        self._ensure_stats_table()
        
        with self._get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    """
                    SELECT h.name, h.description, hs.* 
                    FROM habit_stats hs
                    JOIN habits h ON hs.habit_id = h.id
                    WHERE hs.user_id = %s
                    ORDER BY hs.current_streak DESC, hs.completion_rate DESC
                    """,
                    (user_id,)
                )
                results = cursor.fetchall()
                
        return [dict(row) for row in results]
    
    def generate_stats_report(self, user_id: str) -> Dict[str, Any]:
        """生成用户习惯统计报告"""
        stats = self.get_all_user_stats(user_id)
        
        if not stats:
            self.update_all_user_stats(user_id)
            stats = self.get_all_user_stats(user_id)
        
        # 转换为DataFrame以便计算
        df = pd.DataFrame(stats)
        
        report = {
            "total_habits": len(stats),
            "active_habits": len(df[df['current_streak'] > 0]) if not df.empty else 0,
            "avg_completion_rate": df['completion_rate'].mean() if not df.empty else 0,
            "max_streak": df['longest_streak'].max() if not df.empty else 0,
            "current_max_streak": df['current_streak'].max() if not df.empty else 0,
            "habits_by_streak": []
        }
        
        # 按当前连续天数排序的习惯列表
        if not df.empty:
            top_habits = df.sort_values('current_streak', ascending=False).head(5)
            report["habits_by_streak"] = [
                {
                    "name": row['name'],
                    "current_streak": row['current_streak'],
                    "longest_streak": row['longest_streak'],
                    "completion_rate": row['completion_rate']
                }
                for _, row in top_habits.iterrows()
            ]
            
        return report
        
    def close(self):
        """关闭数据库连接"""
        # 不需要明确关闭连接，因为我们现在使用上下文管理器
        pass
            
    def __enter__(self):
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def get_habit_stats_by_time_range(self, user_id: str, time_range: str = 'week') -> Dict[str, Any]:
        """
        按时间范围获取习惯统计数据
        
        参数:
            user_id: 用户ID
            time_range: 时间范围，可选值：'week', 'month', 'quarter', 'year'
            
        返回:
            统计数据结果
        """
        self._ensure_stats_table()
        self._ensure_global_stats_table()
        
        # 计算时间范围的开始和结束日期
        now = datetime.datetime.now()
        period_start = datetime.datetime.now()
        period_label = ''
        
        # 根据time_range设置时间范围
        if time_range == 'week':
            # 设置为本周的第一天（星期一）
            days_to_monday = period_start.weekday()
            period_start = period_start - timedelta(days=days_to_monday)
            period_label = f"{period_start.strftime('%Y-%m-%d')} 至 {now.strftime('%Y-%m-%d')}"
        elif time_range == 'month':
            # 设置为本月的第一天
            period_start = period_start.replace(day=1)
            period_label = f"{now.year}年{now.month}月"
        elif time_range == 'quarter':
            # 设置为本季度的第一天
            quarter_start_month = (now.month - 1) // 3 * 3 + 1
            period_start = period_start.replace(month=quarter_start_month, day=1)
            period_label = f"{now.year}年 Q{(now.month - 1) // 3 + 1}"
        elif time_range == 'year':
            # 设置为本年的第一天
            period_start = period_start.replace(month=1, day=1)
            period_label = f"{now.year}年"
        
        # 将时间设置为每天的开始（0:00:00）
        period_start = period_start.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # 尝试从全局统计表获取已缓存的数据
        with self._get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    """
                    SELECT * FROM global_habit_stats
                    WHERE user_id = %s 
                    AND time_range = %s 
                    AND period_start = %s
                    LIMIT 1
                    """,
                    (user_id, time_range, period_start)
                )
                cached_stats = cursor.fetchone()
                
                # 如果有缓存数据且是今天更新的，直接返回
                if cached_stats and datetime.datetime.fromisoformat(str(cached_stats['updated_at']).replace('Z', '+00:00')).date() == now.date():
                    return self._format_stats_response(cached_stats, period_label, user_id)
        
        # 没有缓存或缓存已过期，重新计算统计数据
        
        # 1. 获取用户所有习惯
        with self._get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    """
                    SELECT * FROM habits
                    WHERE user_id = %s
                    AND status = 'active'
                    """,
                    (user_id,)
                )
                user_habits = cursor.fetchall()
        
        if not user_habits:
            return {
                "overallCompletionRate": 0,
                "periodLabel": period_label,
                "bestHabit": None,
                "worstHabit": None,
                "habitStats": [],
                "dailyTrend": []
            }
        
        # 2. 获取每个习惯在指定时间范围内的打卡记录
        habit_ids = [habit['id'] for habit in user_habits]
        
        with self._get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    """
                    SELECT id, habit_id, completed_at, status
                    FROM habit_entries
                    WHERE habit_id = ANY(%s)
                    AND user_id = %s
                    AND completed_at >= %s
                    """,
                    (habit_ids, user_id, period_start)
                )
                entries = cursor.fetchall()
        
        # 3. 计算每个习惯的统计数据
        habit_stats = []
        total_completions = 0
        total_failed = 0
        best_habit = None
        worst_habit = None
        
        for habit in user_habits:
            # 获取习惯的详细统计数据
            habit_stat = self.get_habit_stats(habit['id'], user_id)
            
            # 筛选该习惯在时间范围内的打卡记录
            habit_entries = [e for e in entries if e['habit_id'] == habit['id']]
            successful_entries = [e for e in habit_entries if e.get('status') != 'failed']
            failed_entries = [e for e in habit_entries if e.get('status') == 'failed']
            
            # 计算指定时期内的完成率
            days_since_start = (now - period_start).days + 1
            
            # 根据习惯频率和检查日期计算应该打卡的天数
            expected_check_ins = 0
            
            if habit['frequency'] == 'daily':
                # 过滤出符合打卡日的天数
                for i in range(days_since_start):
                    day = period_start + timedelta(days=i)
                    weekday = day.weekday() + 1  # Python的weekday()返回0-6，转换为1-7
                    if weekday == 7:  # 如果是周日(6)，转换为7
                        weekday = 7
                    
                    checkin_days = habit.get('checkin_days', [1, 2, 3, 4, 5, 6, 7])
                    if isinstance(checkin_days, list) and weekday in checkin_days:
                        expected_check_ins += 1
            elif habit['frequency'] == 'weekly':
                expected_check_ins = (days_since_start + 6) // 7  # 向上取整
            elif habit['frequency'] == 'monthly':
                # 简单处理，如果跨月则+1
                if period_start.month != now.month:
                    expected_check_ins = 2
                else:
                    expected_check_ins = 1
            
            completion_rate = len(successful_entries) / expected_check_ins if expected_check_ins > 0 else 0
            
            stat = {
                "id": str(habit['id']),
                "name": habit['name'],
                "completionRate": completion_rate,
                "streak": habit_stat.get('current_streak', 0),
                "totalCompletions": len(successful_entries),
                "missedDays": expected_check_ins - len(successful_entries) if expected_check_ins > len(successful_entries) else 0
            }
            
            habit_stats.append(stat)
            total_completions += len(successful_entries)
            total_failed += len(failed_entries)
            
            # 更新最佳和最差习惯
            if best_habit is None or stat["completionRate"] > best_habit["completionRate"]:
                best_habit = stat
            
            if (worst_habit is None or 
                (stat["completionRate"] < worst_habit["completionRate"] and expected_check_ins > 0)):
                worst_habit = stat
        
        # 4. 计算每日趋势数据
        daily_trend = []
        all_days = set()
        
        # 收集所有有记录的日期
        for entry in entries:
            date_str = datetime.datetime.fromisoformat(str(entry['completed_at']).replace('Z', '+00:00')).date().isoformat()
            all_days.add(date_str)
        
        # 对每个日期计算完成率
        for date_str in sorted(all_days):
            date = datetime.date.fromisoformat(date_str)
            day_entries = [e for e in entries 
                          if datetime.datetime.fromisoformat(str(e['completed_at']).replace('Z', '+00:00')).date().isoformat() == date_str]
            
            # 根据当天应打卡的习惯计算完成率
            day_habits = []
            for habit in user_habits:
                if habit['frequency'] == 'daily':
                    weekday = date.weekday() + 1  # Python的weekday()返回0-6，转换为1-7
                    if weekday == 7:  # 如果是周日(6)，转换为7
                        weekday = 7
                    
                    checkin_days = habit.get('checkin_days', [1, 2, 3, 4, 5, 6, 7])
                    if isinstance(checkin_days, list) and weekday in checkin_days:
                        day_habits.append(habit)
            
            successful_entries = [e for e in day_entries if e.get('status') != 'failed']
            completion_rate = len(successful_entries) / len(day_habits) if day_habits else 0
            
            daily_trend.append({
                "date": date.strftime('%Y-%m-%d'),
                "completionRate": completion_rate
            })
        
        # 5. 计算总体完成率
        overall_completion_rate = sum(stat["completionRate"] for stat in habit_stats) / len(habit_stats) if habit_stats else 0
        
        # 6. 构建并保存全局统计数据
        global_stat = {
            "user_id": user_id,
            "time_range": time_range,
            "period_start": period_start,
            "period_end": now,
            "overall_completion_rate": overall_completion_rate,
            "total_check_ins": total_completions,
            "total_failed": total_failed,
            "best_habit_id": int(best_habit["id"]) if best_habit else None,
            "worst_habit_id": int(worst_habit["id"]) if worst_habit else None,
            "daily_trend": daily_trend,
            "updated_at": now
        }
        
        # 如果有缓存数据则更新，否则创建新记录
        with self._get_connection() as conn:
            with conn.cursor() as cursor:
                if cached_stats:
                    cursor.execute(
                        """
                        UPDATE global_habit_stats
                        SET overall_completion_rate = %s,
                            total_check_ins = %s,
                            total_failed = %s,
                            best_habit_id = %s,
                            worst_habit_id = %s,
                            daily_trend = %s,
                            updated_at = %s
                        WHERE id = %s
                        """,
                        (
                            global_stat["overall_completion_rate"],
                            global_stat["total_check_ins"],
                            global_stat["total_failed"],
                            global_stat["best_habit_id"],
                            global_stat["worst_habit_id"],
                            global_stat["daily_trend"],
                            global_stat["updated_at"],
                            cached_stats["id"]
                        )
                    )
                else:
                    cursor.execute(
                        """
                        INSERT INTO global_habit_stats
                        (user_id, time_range, period_start, period_end, 
                         overall_completion_rate, total_check_ins, total_failed, 
                         best_habit_id, worst_habit_id, daily_trend, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            global_stat["user_id"],
                            global_stat["time_range"],
                            global_stat["period_start"],
                            global_stat["period_end"],
                            global_stat["overall_completion_rate"],
                            global_stat["total_check_ins"],
                            global_stat["total_failed"],
                            global_stat["best_habit_id"],
                            global_stat["worst_habit_id"],
                            global_stat["daily_trend"],
                            global_stat["updated_at"]
                        )
                    )
                conn.commit()
        
        # 7. 返回统计结果
        return {
            "overallCompletionRate": overall_completion_rate,
            "periodLabel": period_label,
            "bestHabit": best_habit,
            "worstHabit": worst_habit,
            "habitStats": habit_stats,
            "dailyTrend": daily_trend
        }
    
    def _format_stats_response(self, cached_stat: Dict, period_label: str, user_id: str) -> Dict[str, Any]:
        """格式化缓存的统计数据返回结果"""
        # 获取最佳和最差习惯的详细信息
        best_habit = None
        worst_habit = None
        
        if cached_stat['best_habit_id']:
            with self._get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    cursor.execute(
                        """
                        SELECT * FROM habits
                        WHERE id = %s
                        LIMIT 1
                        """,
                        (cached_stat['best_habit_id'],)
                    )
                    habit = cursor.fetchone()
                    
                    if habit:
                        habit_stat = self.get_habit_stats(habit['id'], user_id)
                        best_habit = {
                            "id": str(habit['id']),
                            "name": habit['name'],
                            "completionRate": 1,  # 简化处理，作为最佳习惯可以默认为1
                            "streak": habit_stat.get('current_streak', 0),
                            "totalCompletions": habit_stat.get('total_check_ins', 0),
                            "missedDays": 0
                        }
        
        if cached_stat['worst_habit_id']:
            with self._get_connection() as conn:
                with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                    cursor.execute(
                        """
                        SELECT * FROM habits
                        WHERE id = %s
                        LIMIT 1
                        """,
                        (cached_stat['worst_habit_id'],)
                    )
                    habit = cursor.fetchone()
                    
                    if habit:
                        habit_stat = self.get_habit_stats(habit['id'], user_id)
                        worst_habit = {
                            "id": str(habit['id']),
                            "name": habit['name'],
                            "completionRate": 0,  # 简化处理，作为最差习惯可以默认为0
                            "streak": habit_stat.get('current_streak', 0),
                            "totalCompletions": habit_stat.get('total_check_ins', 0),
                            "missedDays": habit_stat.get('days_in_period', 30) - habit_stat.get('total_check_ins', 0)
                        }
        
        # 获取所有习惯的统计信息
        habit_stats = []
        
        with self._get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(
                    """
                    SELECT h.*, hs.current_streak, hs.total_check_ins
                    FROM habits h
                    LEFT JOIN habit_stats hs ON h.id = hs.habit_id AND hs.user_id = %s
                    WHERE h.user_id = %s
                    AND h.status = 'active'
                    """,
                    (user_id, user_id)
                )
                habits = cursor.fetchall()
                
                for habit in habits:
                    # 计算该习惯的完成率（简化处理）
                    if str(habit['id']) == str(cached_stat['best_habit_id']):
                        completion_rate = 1
                    elif str(habit['id']) == str(cached_stat['worst_habit_id']):
                        completion_rate = 0
                    else:
                        # 使用平均值
                        completion_rate = cached_stat['overall_completion_rate'] / 100
                    
                    habit_stats.append({
                        "id": str(habit['id']),
                        "name": habit['name'],
                        "completionRate": completion_rate,
                        "streak": habit.get('current_streak', 0),
                        "totalCompletions": habit.get('total_check_ins', 0),
                        "missedDays": 0  # 简化处理
                    })
        
        return {
            "overallCompletionRate": cached_stat['overall_completion_rate'] / 100,
            "periodLabel": period_label,
            "bestHabit": best_habit,
            "worstHabit": worst_habit,
            "habitStats": habit_stats,
            "dailyTrend": cached_stat['daily_trend']
        }
# 命令行入口
if __name__ == "__main__":
    import sys
    import json
    
    # 解析命令行参数
    if len(sys.argv) < 2:
        print("用法: python habit_stats.py <命令> [参数...]")
        print("支持的命令:")
        print("  update <用户ID>               - 更新指定用户的所有习惯统计")
        print("  stats <用户ID> <习惯ID>       - 获取指定习惯的统计数据")
        print("  all <用户ID>                  - 获取所有习惯的统计数据")
        print("  report <用户ID>               - 生成习惯统计报告")
        print("  stats_by_range <用户ID> <time_range> - 按时间范围获取统计数据 (time_range: week/month/quarter/year)")
        sys.exit(1)
    
    command = sys.argv[1]
    service = HabitStatsService()
    
    try:
        if command == "update":
            if len(sys.argv) > 2:
                user_id = sys.argv[2]
                count = service.update_all_user_stats(user_id)
                print(f"已更新 {count} 个习惯的统计数据")
            else:
                count = service.update_all_user_stats()
                print(f"已更新 {count} 个习惯的统计数据")
                
        elif command == "stats":
            if len(sys.argv) < 4:
                print("错误: 需要提供用户ID和习惯ID")
                sys.exit(1)
                
            user_id = sys.argv[2]
            habit_id = int(sys.argv[3])
            stats = service.get_habit_stats(habit_id, user_id)
            print(json.dumps(stats, indent=2, ensure_ascii=False, default=str))
            
        elif command == "all":
            if len(sys.argv) < 3:
                print("错误: 需要提供用户ID")
                sys.exit(1)
                
            user_id = sys.argv[2]
            stats = service.get_all_user_stats(user_id)
            print(json.dumps(stats, indent=2, ensure_ascii=False, default=str))
            
        elif command == "report":
            if len(sys.argv) < 3:
                print("错误: 需要提供用户ID")
                sys.exit(1)
                
            user_id = sys.argv[2]
            report = service.generate_stats_report(user_id)
            print(json.dumps(report, indent=2, ensure_ascii=False, default=str))
            
        elif command == "stats_by_range":
            if len(sys.argv) < 3:
                print("错误: 需要提供用户ID")
                sys.exit(1)
                
            user_id = sys.argv[2]
            time_range = 'week'  # 默认值
            
            if len(sys.argv) > 3:
                time_range = sys.argv[3]
                if time_range not in ['week', 'month', 'quarter', 'year']:
                    print("错误: time_range 参数必须是 week/month/quarter/year 之一")
                    sys.exit(1)
            
            stats = service.get_habit_stats_by_time_range(user_id, time_range)
            print(json.dumps(stats, indent=2, ensure_ascii=False, default=str))
            
        else:
            print(f"错误: 未知命令 '{command}'")
            sys.exit(1)
            
    except Exception as e:
        import traceback
        print(f"执行出错: {e}")
        traceback.print_exc()
        sys.exit(1)
    finally:
        service.close()