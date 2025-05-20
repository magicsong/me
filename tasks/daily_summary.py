#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
每日数据摘要任务
"""
import logging
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime, timedelta
from typing import Dict, List, Any

from db import db
from utils import get_yesterday, save_dataframe_to_csv, save_summary_to_json

logger = logging.getLogger(__name__)

def get_yesterday_habits_data() -> pd.DataFrame:
    """获取昨天的习惯数据"""
    yesterday = get_yesterday()
    query = """
    SELECT 
        h.id, h.name, h.description, h.category, 
        hc.completion_date, hc.is_completed
    FROM habits h
    LEFT JOIN habit_completions hc ON h.id = hc.habit_id
    WHERE hc.completion_date = %(yesterday)s
    ORDER BY h.category, h.name
    """
    return db.query_to_dataframe(query, {"yesterday": yesterday.date()})

def get_yesterday_todos() -> pd.DataFrame:
    """获取昨天的待办事项数据"""
    yesterday = get_yesterday()
    query = """
    SELECT 
        id, title, description, status, due_date, completed_at, 
        priority, created_at, updated_at, tags
    FROM todos
    WHERE DATE(created_at) = %(yesterday)s OR DATE(completed_at) = %(yesterday)s
    ORDER BY priority DESC, created_at
    """
    return db.query_to_dataframe(query, {"yesterday": yesterday.date()})

def get_yesterday_notes() -> pd.DataFrame:
    """获取昨天的笔记数据"""
    yesterday = get_yesterday()
    query = """
    SELECT 
        id, title, content, tags, created_at, updated_at
    FROM notes
    WHERE DATE(created_at) = %(yesterday)s OR DATE(updated_at) = %(yesterday)s
    ORDER BY created_at
    """
    return db.query_to_dataframe(query, {"yesterday": yesterday.date()})

def analyze_habits(df: pd.DataFrame) -> Dict[str, Any]:
    """分析习惯数据"""
    if df.empty:
        return {"message": "昨天没有习惯数据记录"}
    
    # 计算完成率
    completion_rate = df['is_completed'].mean() * 100
    
    # 按类别统计
    category_stats = df.groupby('category').agg(
        total=('id', 'count'),
        completed=('is_completed', 'sum')
    )
    category_stats['completion_rate'] = (category_stats['completed'] / category_stats['total']) * 100
    
    return {
        "total_habits": len(df),
        "completion_rate": completion_rate,
        "category_stats": category_stats.to_dict(orient='index')
    }

def analyze_todos(df: pd.DataFrame) -> Dict[str, Any]:
    """分析待办事项数据"""
    if df.empty:
        return {"message": "昨天没有待办事项数据记录"}
    
    # 计算完成率
    completed = df[df['status'] == 'completed']
    completion_rate = len(completed) / len(df) * 100 if len(df) > 0 else 0
    
    # 按优先级统计
    priority_stats = df.groupby('priority').agg(
        total=('id', 'count'),
        completed=(pd.Series(df['status'] == 'completed'), 'sum')
    )
    
    # 分析标签
    tags = []
    for tags_list in df['tags'].dropna():
        if isinstance(tags_list, list):
            tags.extend(tags_list)
    tag_counts = pd.Series(tags).value_counts().to_dict()
    
    return {
        "total_todos": len(df),
        "completed_todos": len(completed),
        "completion_rate": completion_rate,
        "priority_stats": priority_stats.to_dict(orient='index'),
        "common_tags": tag_counts
    }

def analyze_notes(df: pd.DataFrame) -> Dict[str, Any]:
    """分析笔记数据"""
    if df.empty:
        return {"message": "昨天没有笔记数据记录"}
    
    # 统计新建和更新的笔记
    yesterday = get_yesterday().date()
    new_notes = df[pd.to_datetime(df['created_at']).dt.date == yesterday]
    updated_notes = df[(pd.to_datetime(df['updated_at']).dt.date == yesterday) & 
                      (pd.to_datetime(df['created_at']).dt.date != yesterday)]
    
    # 分析标签
    tags = []
    for tags_list in df['tags'].dropna():
        if isinstance(tags_list, list):
            tags.extend(tags_list)
    tag_counts = pd.Series(tags).value_counts().to_dict()
    
    return {
        "total_notes": len(df),
        "new_notes": len(new_notes),
        "updated_notes": len(updated_notes),
        "common_tags": tag_counts
    }

def generate_daily_summary() -> Dict[str, Any]:
    """生成每日摘要报告"""
    yesterday = get_yesterday()
    yesterday_str = yesterday.strftime('%Y-%m-%d')
    
    logger.info(f"开始生成 {yesterday_str} 的每日摘要...")
    
    # 获取数据
    habits_df = get_yesterday_habits_data()
    todos_df = get_yesterday_todos()
    notes_df = get_yesterday_notes()
    
    # 保存原始数据
    save_dataframe_to_csv(habits_df, f"habits_{yesterday_str}.csv")
    save_dataframe_to_csv(todos_df, f"todos_{yesterday_str}.csv")
    save_dataframe_to_csv(notes_df, f"notes_{yesterday_str}.csv")
    
    # 分析数据
    habits_analysis = analyze_habits(habits_df)
    todos_analysis = analyze_todos(todos_df)
    notes_analysis = analyze_notes(notes_df)
    
    # 生成摘要
    summary = {
        "date": yesterday_str,
        "habits": habits_analysis,
        "todos": todos_analysis,
        "notes": notes_analysis,
        "overall": {
            "productivity_score": calculate_productivity_score(habits_analysis, todos_analysis)
        }
    }
    
    # 保存摘要
    save_summary_to_json(summary, f"daily_summary_{yesterday_str}.json")
    
    logger.info(f"完成 {yesterday_str} 的每日摘要生成")
    return summary

def calculate_productivity_score(habits_analysis: Dict[str, Any], todos_analysis: Dict[str, Any]) -> float:
    """计算生产力得分 (0-100)"""
    # 如果没有数据，返回默认值
    if "message" in habits_analysis or "message" in todos_analysis:
        return 50.0
    
    # 习惯完成率占40%
    habit_score = habits_analysis.get("completion_rate", 0) * 0.4
    
    # 待办事项完成率占60%
    todo_score = todos_analysis.get("completion_rate", 0) * 0.6
    
    return habit_score + todo_score

if __name__ == "__main__":
    summary = generate_daily_summary()
    print(f"生产力得分: {summary['overall']['productivity_score']:.2f}/100")
