#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
周报数据摘要任务
"""
import logging
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime, timedelta
import os
from typing import Dict, List, Any

from db import db
from utils import get_date_range, save_dataframe_to_csv, save_summary_to_json

logger = logging.getLogger(__name__)

def get_weekly_habits_data(days=7) -> pd.DataFrame:
    """获取一周的习惯数据"""
    date_range = get_date_range(days)
    query = """
    SELECT 
        h.id, h.name, h.description, h.category, 
        hc.completion_date, hc.is_completed
    FROM habits h
    LEFT JOIN habit_completions hc ON h.id = hc.habit_id
    WHERE hc.completion_date BETWEEN %(start_date)s AND %(end_date)s
    ORDER BY hc.completion_date, h.category, h.name
    """
    return db.query_to_dataframe(query, {
        "start_date": date_range["start_date"].date(),
        "end_date": date_range["end_date"].date()
    })

def get_weekly_todos(days=7) -> pd.DataFrame:
    """获取一周的待办事项数据"""
    date_range = get_date_range(days)
    query = """
    SELECT 
        id, title, description, status, due_date, completed_at, 
        priority, created_at, updated_at, tags
    FROM todos
    WHERE (DATE(created_at) BETWEEN %(start_date)s AND %(end_date)s) 
       OR (DATE(completed_at) BETWEEN %(start_date)s AND %(end_date)s)
    ORDER BY priority DESC, created_at
    """
    return db.query_to_dataframe(query, {
        "start_date": date_range["start_date"].date(),
        "end_date": date_range["end_date"].date()
    })

def get_weekly_notes(days=7) -> pd.DataFrame:
    """获取一周的笔记数据"""
    date_range = get_date_range(days)
    query = """
    SELECT 
        id, title, content, tags, created_at, updated_at
    FROM notes
    WHERE (DATE(created_at) BETWEEN %(start_date)s AND %(end_date)s) 
       OR (DATE(updated_at) BETWEEN %(start_date)s AND %(end_date)s)
    ORDER BY created_at
    """
    return db.query_to_dataframe(query, {
        "start_date": date_range["start_date"].date(),
        "end_date": date_range["end_date"].date()
    })

def analyze_weekly_habits(df: pd.DataFrame) -> Dict[str, Any]:
    """分析一周的习惯数据"""
    if df.empty:
        return {"message": "本周没有习惯数据记录"}
    
    # 转换日期列
    df['completion_date'] = pd.to_datetime(df['completion_date'])
    
    # 按天计算完成率
    daily_completion = df.groupby(df['completion_date'].dt.date).agg(
        total=('id', 'count'),
        completed=('is_completed', 'sum')
    )
    daily_completion['completion_rate'] = (daily_completion['completed'] / daily_completion['total']) * 100
    
    # 按类别统计
    category_stats = df.groupby('category').agg(
        total=('id', 'count'),
        completed=('is_completed', 'sum')
    )
    category_stats['completion_rate'] = (category_stats['completed'] / category_stats['total']) * 100
    
    # 按习惯统计
    habit_stats = df.groupby('name').agg(
        total=('id', 'count'),
        completed=('is_completed', 'sum')
    )
    habit_stats['completion_rate'] = (habit_stats['completed'] / habit_stats['total']) * 100
    
    # 生成日期范围内每天的习惯完成图表
    plt.figure(figsize=(10, 6))
    sns.lineplot(x=daily_completion.index, y=daily_completion['completion_rate'])
    plt.title('每日习惯完成率趋势')
    plt.xlabel('日期')
    plt.ylabel('完成率 (%)')
    plt.ylim(0, 100)
    plt.grid(True)
    
    # 保存图表
    output_dir = "output"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    plt.savefig(os.path.join(output_dir, "weekly_habits_trend.png"))
    plt.close()
    
    return {
        "total_habits": len(df['name'].unique()),
        "total_completions": len(df),
        "average_completion_rate": df['is_completed'].mean() * 100,
        "daily_completion": daily_completion.to_dict(orient='index'),
        "category_stats": category_stats.to_dict(orient='index'),
        "habit_stats": habit_stats.to_dict(orient='index')
    }

def analyze_weekly_todos(df: pd.DataFrame) -> Dict[str, Any]:
    """分析一周的待办事项数据"""
    if df.empty:
        return {"message": "本周没有待办事项数据记录"}
    
    # 转换日期列
    df['created_at'] = pd.to_datetime(df['created_at'])
    df['completed_at'] = pd.to_datetime(df['completed_at'])
    
    # 计算每天的待办创建和完成数量
    df['created_date'] = df['created_at'].dt.date
    df['completed_date'] = df['completed_at'].dt.date
    
    daily_created = df.groupby('created_date').size()
    daily_completed = df.dropna(subset=['completed_date']).groupby('completed_date').size()
    
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
    
    # 生成每日创建和完成数量的图表
    plt.figure(figsize=(12, 6))
    ax = plt.gca()
    daily_created.plot(kind='bar', ax=ax, color='blue', alpha=0.6, label='新建待办')
    daily_completed.plot(kind='bar', ax=ax, color='green', alpha=0.6, label='完成待办')
    plt.title('每日待办事项创建和完成情况')
    plt.xlabel('日期')
    plt.ylabel('数量')
    plt.legend()
    plt.grid(True, axis='y')
    
    # 保存图表
    output_dir = "output"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    plt.savefig(os.path.join(output_dir, "weekly_todos_trend.png"))
    plt.close()
    
    return {
        "total_todos": len(df),
        "new_todos": len(df.dropna(subset=['created_date'])),
        "completed_todos": len(completed),
        "completion_rate": completion_rate,
        "daily_created": daily_created.to_dict(),
        "daily_completed": daily_completed.to_dict(),
        "priority_stats": priority_stats.to_dict(orient='index'),
        "common_tags": tag_counts
    }

def analyze_weekly_notes(df: pd.DataFrame) -> Dict[str, Any]:
    """分析一周的笔记数据"""
    if df.empty:
        return {"message": "本周没有笔记数据记录"}
    
    # 转换日期列
    df['created_at'] = pd.to_datetime(df['created_at'])
    df['updated_at'] = pd.to_datetime(df['updated_at'])
    
    # 计算每天的笔记创建和更新数量
    df['created_date'] = df['created_at'].dt.date
    df['updated_date'] = df['updated_at'].dt.date
    
    daily_created = df.groupby('created_date').size()
    
    # 只计算非创建日的更新
    df['is_update'] = df['created_date'] != df['updated_date']
    daily_updated = df[df['is_update']].groupby('updated_date').size()
    
    # 分析标签
    tags = []
    for tags_list in df['tags'].dropna():
        if isinstance(tags_list, list):
            tags.extend(tags_list)
    tag_counts = pd.Series(tags).value_counts().to_dict()
    
    # 生成每日笔记创建和更新数量的图表
    plt.figure(figsize=(12, 6))
    ax = plt.gca()
    daily_created.plot(kind='bar', ax=ax, color='blue', alpha=0.6, label='新建笔记')
    daily_updated.plot(kind='bar', ax=ax, color='orange', alpha=0.6, label='更新笔记')
    plt.title('每日笔记创建和更新情况')
    plt.xlabel('日期')
    plt.ylabel('数量')
    plt.legend()
    plt.grid(True, axis='y')
    
    # 保存图表
    output_dir = "output"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    plt.savefig(os.path.join(output_dir, "weekly_notes_trend.png"))
    plt.close()
    
    return {
        "total_notes": len(df),
        "new_notes": len(df.dropna(subset=['created_date'])),
        "updated_notes": len(df[df['is_update']]),
        "daily_created": daily_created.to_dict(),
        "daily_updated": daily_updated.to_dict(),
        "common_tags": tag_counts
    }

def generate_weekly_summary(days=7) -> Dict[str, Any]:
    """生成周报摘要"""
    date_range = get_date_range(days)
    start_date_str = date_range["start_date"].strftime('%Y-%m-%d')
    end_date_str = date_range["end_date"].strftime('%Y-%m-%d')
    
    logger.info(f"开始生成 {start_date_str} 至 {end_date_str} 的周报摘要...")
    
    # 获取数据
    habits_df = get_weekly_habits_data(days)
    todos_df = get_weekly_todos(days)
    notes_df = get_weekly_notes(days)
    
    # 保存原始数据
    save_dataframe_to_csv(habits_df, f"weekly_habits_{start_date_str}_{end_date_str}.csv")
    save_dataframe_to_csv(todos_df, f"weekly_todos_{start_date_str}_{end_date_str}.csv")
    save_dataframe_to_csv(notes_df, f"weekly_notes_{start_date_str}_{end_date_str}.csv")
    
    # 分析数据
    habits_analysis = analyze_weekly_habits(habits_df)
    todos_analysis = analyze_weekly_todos(todos_df)
    notes_analysis = analyze_weekly_notes(notes_df)
    
    # 生成摘要
    summary = {
        "period": {
            "start_date": start_date_str,
            "end_date": end_date_str,
            "days": days
        },
        "habits": habits_analysis,
        "todos": todos_analysis,
        "notes": notes_analysis,
        "overall": {
            "productivity_score": calculate_weekly_productivity_score(habits_analysis, todos_analysis)
        }
    }
    
    # 保存摘要
    save_summary_to_json(summary, f"weekly_summary_{start_date_str}_{end_date_str}.json")
    
    logger.info(f"完成 {start_date_str} 至 {end_date_str} 的周报摘要生成")
    return summary

def calculate_weekly_productivity_score(habits_analysis: Dict[str, Any], todos_analysis: Dict[str, Any]) -> float:
    """计算周度生产力得分 (0-100)"""
    # 如果没有数据，返回默认值
    if "message" in habits_analysis or "message" in todos_analysis:
        return 50.0
    
    # 习惯完成率占40%
    habit_score = habits_analysis.get("average_completion_rate", 0) * 0.4
    
    # 待办事项完成率占60%
    todo_score = todos_analysis.get("completion_rate", 0) * 0.6
    
    return habit_score + todo_score

if __name__ == "__main__":
    summary = generate_weekly_summary()
    print(f"周度生产力得分: {summary['overall']['productivity_score']:.2f}/100")
