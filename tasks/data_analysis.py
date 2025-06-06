#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据分析模块 - 分析用户的习惯、待办事项、笔记和番茄钟数据
"""
import logging
import pandas as pd
from typing import Dict, List, Any, Optional
from datetime import datetime

from utils import get_yesterday

logger = logging.getLogger(__name__)

def analyze_habits_data(df: pd.DataFrame) -> Dict[str, Any]:
    """分析习惯数据"""
    if df.empty:
        return {"message": "昨天没有习惯数据记录"}
    
    # 完成的习惯数量
    completed_habits = df[df['status'] == 'completed'].shape[0]
    
    # 失败的习惯数量
    failed_habits = df[df['status'] == 'failed'].shape[0]
    
    # 总习惯数量
    total_habits = df.shape[0]
    
    # 计算完成率
    completion_rate = (completed_habits / total_habits) * 100 if total_habits > 0 else 0
    
    # 按类别统计
    category_stats = {}
    if 'category' in df.columns:
        category_counts = df.groupby(['category', 'status']).size().unstack(fill_value=0)
        for category in category_counts.index:
            category_stats[category] = {
                'total': category_counts.loc[category].sum(),
                'completed': category_counts.loc[category].get('completed', 0),
                'failed': category_counts.loc[category].get('failed', 0),
                'completion_rate': (category_counts.loc[category].get('completed', 0) / category_counts.loc[category].sum()) * 100
            }
    
    # 按难度统计 (如果有难度数据)
    difficulty_stats = {}
    if 'difficulty' in df.columns and not df['difficulty'].isna().all():
        difficulty_counts = df.groupby(['difficulty']).size()
        for difficulty in difficulty_counts.index:
            if pd.notna(difficulty):  # 确保不是 NaN
                difficulty_stats[difficulty] = difficulty_counts[difficulty]
    
    return {
        "total_habits": total_habits,
        "completed_habits": completed_habits,
        "failed_habits": failed_habits,
        "completion_rate": completion_rate,
        "category_stats": category_stats,
        "difficulty_stats": difficulty_stats
    }

def analyze_todos_data(df: pd.DataFrame) -> Dict[str, Any]:
    """分析待办事项数据"""
    if df.empty:
        return {"message": "昨天没有待办事项数据记录"}
    
    # 计算完成率
    completed_todos = df[df['status'] == 'completed'].shape[0]
    total_todos = df.shape[0]
    completion_rate = (completed_todos / total_todos) * 100 if total_todos > 0 else 0
    
    # 新创建的待办事项
    yesterday = get_yesterday().date()
    new_todos = df[pd.to_datetime(df['created_at']).dt.date == yesterday].shape[0]
    
    # 按优先级统计
    priority_stats = {}
    if 'priority' in df.columns:
        priority_counts = df.groupby(['priority', 'status']).size().unstack(fill_value=0)
        for priority in priority_counts.index:
            priority_stats[priority] = {
                'total': priority_counts.loc[priority].sum(),
                'completed': priority_counts.loc[priority].get('completed', 0),
                'completion_rate': (priority_counts.loc[priority].get('completed', 0) / priority_counts.loc[priority].sum()) * 100
            }
    
    # 到期情况统计
    overdue_todos = 0
    if 'due_date' in df.columns and not df['due_date'].isna().all():
        yesterday_dt = get_yesterday()
        overdue_todos = df[(pd.to_datetime(df['due_date']) < yesterday_dt) & (df['status'] != 'completed')].shape[0]
    
    return {
        "total_todos": total_todos,
        "completed_todos": completed_todos,
        "new_todos": new_todos,
        "completion_rate": completion_rate,
        "priority_stats": priority_stats,
        "overdue_todos": overdue_todos
    }

def analyze_notes_data(df: pd.DataFrame) -> Dict[str, Any]:
    """分析笔记数据"""
    if df.empty:
        return {"message": "昨天没有笔记数据记录"}
    
    # 统计新建和更新的笔记
    yesterday = get_yesterday().date()
    new_notes = df[pd.to_datetime(df['created_at']).dt.date == yesterday].shape[0]
    updated_notes = df[(pd.to_datetime(df['updated_at']).dt.date == yesterday) & 
                     (pd.to_datetime(df['created_at']).dt.date != yesterday)].shape[0]
    
    # 按类别统计
    category_stats = {}
    if 'category' in df.columns and not df['category'].isna().all():
        category_counts = df.groupby('category').size()
        for category in category_counts.index:
            if pd.notna(category):  # 确保不是 NaN
                category_stats[category] = category_counts[category]
    
    # 内容长度分析
    content_length_stats = {}
    if 'content' in df.columns:
        df['content_length'] = df['content'].str.len()
        content_length_stats = {
            'average': df['content_length'].mean(),
            'max': df['content_length'].max(),
            'min': df['content_length'].min()
        }
    
    return {
        "total_notes": df.shape[0],
        "new_notes": new_notes,
        "updated_notes": updated_notes,
        "category_stats": category_stats,
        "content_length_stats": content_length_stats
    }

def analyze_pomodoros_data(df: pd.DataFrame, tags_by_pomodoro: Dict[int, List[Dict]]) -> Dict[str, Any]:
    """分析番茄钟数据"""
    if df.empty:
        return {"message": "昨天没有番茄钟数据记录"}
    
    # 统计番茄钟状态
    status_counts = df['status'].value_counts().to_dict()
    
    # 计算总专注时间(分钟)
    total_duration = df['duration'].sum()
    
    # 计算完成的番茄钟时间
    completed_duration = df[df['status'] == 'completed']['duration'].sum()
    
    # 按时段分布统计
    hourly_distribution = {}
    if 'start_time' in df.columns:
        df['hour'] = pd.to_datetime(df['start_time']).dt.hour
        hour_counts = df.groupby('hour').size()
        for hour in hour_counts.index:
            hourly_distribution[int(hour)] = int(hour_counts[hour])
    
    # 标签统计
    tag_stats = {}
    for pomodoro_id, tags in tags_by_pomodoro.items():
        for tag in tags:
            tag_name = tag['name']
            if tag_name not in tag_stats:
                tag_stats[tag_name] = 0
            tag_stats[tag_name] += 1
    
    # 任务关联统计
    task_relation_stats = {
        'with_todo': df['todo_id'].notna().sum(),
        'with_habit': df['habit_id'].notna().sum(),
        'with_goal': df['goal_id'].notna().sum(),
        'standalone': df[df['todo_id'].isna() & df['habit_id'].isna() & df['goal_id'].isna()].shape[0]
    }
    
    return {
        "total_pomodoros": df.shape[0],
        "status_counts": status_counts,
        "total_duration": total_duration,
        "completed_duration": completed_duration,
        "completion_rate": (status_counts.get('completed', 0) / df.shape[0]) * 100 if df.shape[0] > 0 else 0,
        "hourly_distribution": hourly_distribution,
        "tag_stats": tag_stats,
        "task_relation_stats": task_relation_stats
    }

def combine_analysis_data(
    user_id: str,
    date_str: str,
    habits_analysis: Dict[str, Any],
    todos_analysis: Dict[str, Any],
    notes_analysis: Dict[str, Any],
    pomodoros_analysis: Dict[str, Any],
    daily_summary: Dict[str, Any]
) -> Dict[str, Any]:
    """
    整合所有分析数据
    """
    has_data = not (
        "message" in habits_analysis 
        and "message" in todos_analysis 
        and "message" in notes_analysis 
        and "message" in pomodoros_analysis 
        and not daily_summary
    )
    
    return {
        "date": date_str,
        "user_id": user_id,
        "habits": habits_analysis,
        "todos": todos_analysis,
        "notes": notes_analysis,
        "pomodoros": pomodoros_analysis,
        "daily_summary": daily_summary,
        "overall": {
            "has_data": has_data,
            "total_completed_tasks": habits_analysis.get("completed_habits", 0) + todos_analysis.get("completed_todos", 0),
            "total_focus_minutes": pomodoros_analysis.get("total_duration", 0),
            "completed_focus_minutes": pomodoros_analysis.get("completed_duration", 0)
        }
    }
