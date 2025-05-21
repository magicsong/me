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

    def calculate_check_in_stats(self, habit_id: int, user_id: str) -> Dict[str, Any]:
        """
        计算打卡统计数据
        
        参数:
            habit_id: 习惯ID
            user_id: 用户ID
            
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
        
        # 计算完成率（最近30天）
        thirty_days_ago = (datetime.datetime.now() - timedelta(days=30)).date()
        days_in_period = 30
        
        check_ins_in_last_30_days = 0
        for date_str in unique_dates:
            date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
            if date >= thirty_days_ago:
                check_ins_in_last_30_days += 1
        
        completion_rate = (check_ins_in_last_30_days / days_in_period) * 100
        
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