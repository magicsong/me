#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
自定义图表生成器
根据从数据库获取的数据生成各种可视化图表
"""
import logging
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
import json
from datetime import datetime, timedelta
import os
import argparse
from typing import Dict, List, Any, Optional, Tuple

from db import db
from utils import get_date_range, save_dataframe_to_csv
from config import config

# 配置日志
logging.basicConfig(
    level=getattr(logging, config.log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 配置中文字体支持
plt.rcParams['font.sans-serif'] = ['SimHei']  # 指定默认字体
plt.rcParams['axes.unicode_minus'] = False  # 解决保存图像时负号'-'显示为方块的问题

# 配置图表风格
sns.set_style("whitegrid")  # 设置Seaborn绘图风格
plt.rcParams['figure.figsize'] = (12, 8)  # 设置图表大小
plt.rcParams['savefig.dpi'] = 300  # 设置保存图片的DPI

def get_habits_data(start_date=None, end_date=None, days=30) -> pd.DataFrame:
    """获取习惯数据"""
    if not start_date or not end_date:
        date_range = get_date_range(days)
        start_date = date_range["start_date"].date()
        end_date = date_range["end_date"].date()
    
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
        "start_date": start_date,
        "end_date": end_date
    })

def get_todos_data(start_date=None, end_date=None, days=30) -> pd.DataFrame:
    """获取待办事项数据"""
    if not start_date or not end_date:
        date_range = get_date_range(days)
        start_date = date_range["start_date"].date()
        end_date = date_range["end_date"].date()
    
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
        "start_date": start_date,
        "end_date": end_date
    })

def plot_habits_completion_trend(df: pd.DataFrame, output_dir: str = "output") -> str:
    """绘制习惯完成趋势图"""
    if df.empty:
        logger.warning("没有习惯数据，无法生成趋势图")
        return ""
    
    # 确保日期列的类型正确
    df['completion_date'] = pd.to_datetime(df['completion_date'])
    
    # 按日期和类别统计完成率
    daily_completion = df.groupby([df['completion_date'].dt.date, 'category']).agg(
        total=('id', 'count'),
        completed=('is_completed', 'sum')
    ).reset_index()
    daily_completion['completion_rate'] = (daily_completion['completed'] / daily_completion['total']) * 100
    
    # 创建图表
    plt.figure(figsize=(14, 8))
    
    # 按类别分组绘制
    for category, group in daily_completion.groupby('category'):
        plt.plot(group['completion_date'], group['completion_rate'], 
                marker='o', linestyle='-', label=category)
    
    plt.title('习惯完成率趋势（按类别）', fontsize=16)
    plt.xlabel('日期', fontsize=12)
    plt.ylabel('完成率 (%)', fontsize=12)
    plt.ylim(0, 105)  # 设置y轴范围，留出一些空间给图例
    plt.grid(True)
    plt.legend(title='类别', loc='best')
    
    # 添加平均线
    overall_avg = df['is_completed'].mean() * 100
    plt.axhline(y=overall_avg, color='r', linestyle='--', 
               label=f'整体平均: {overall_avg:.1f}%')
    
    # 保存图表
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    filename = os.path.join(output_dir, "habits_completion_trend.png")
    plt.savefig(filename)
    plt.close()
    logger.info(f"习惯完成趋势图已保存到 {filename}")
    
    return filename

def plot_habits_heatmap(df: pd.DataFrame, output_dir: str = "output") -> str:
    """绘制习惯热力图"""
    if df.empty:
        logger.warning("没有习惯数据，无法生成热力图")
        return ""
    
    # 确保日期列的类型正确
    df['completion_date'] = pd.to_datetime(df['completion_date'])
    
    # 提取日期和星期几
    df['date'] = df['completion_date'].dt.date
    df['weekday'] = df['completion_date'].dt.weekday  # 0=周一, 6=周日
    df['week'] = df['completion_date'].dt.isocalendar().week
    
    # 按习惯名称、日期统计完成情况
    pivot_df = df.pivot_table(
        index=['name', 'weekday'], 
        columns='week', 
        values='is_completed',
        aggfunc='mean'
    ).fillna(0)
    
    # 每个习惯生成一个热力图
    for habit_name, habit_data in pivot_df.groupby(level=0):
        # 重置多级索引，只保留weekday
        habit_data = habit_data.reset_index(level=0, drop=True)
        
        plt.figure(figsize=(12, 4))
        
        # 绘制热力图
        ax = sns.heatmap(
            habit_data, 
            cmap="YlGnBu", 
            vmin=0, 
            vmax=1, 
            cbar_kws={'label': '完成率'},
            linewidths=0.5
        )
        
        # 设置y轴标签为星期几
        weekday_names = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
        ax.set_yticklabels(weekday_names)
        
        # 设置标题和标签
        plt.title(f'习惯 "{habit_name}" 每周完成情况', fontsize=16)
        plt.xlabel('周数', fontsize=12)
        
        # 保存图表
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
        
        # 文件名中不能包含特殊字符
        safe_name = "".join([c if c.isalnum() else "_" for c in habit_name])
        filename = os.path.join(output_dir, f"habit_heatmap_{safe_name}.png")
        plt.savefig(filename)
        plt.close()
        logger.info(f"习惯 '{habit_name}' 热力图已保存到 {filename}")
    
    return output_dir

def plot_todos_priority_pie(df: pd.DataFrame, output_dir: str = "output") -> str:
    """绘制待办事项优先级饼图"""
    if df.empty:
        logger.warning("没有待办事项数据，无法生成饼图")
        return ""
    
    # 按优先级统计
    priority_counts = df['priority'].value_counts().sort_index()
    
    # 创建图表
    plt.figure(figsize=(10, 8))
    
    # 自定义颜色
    colors = ['#ff9999', '#66b3ff', '#99ff99', '#ffcc99']
    
    # 绘制饼图
    plt.pie(
        priority_counts.values, 
        labels=priority_counts.index, 
        autopct='%1.1f%%',
        startangle=90, 
        colors=colors,
        wedgeprops={'edgecolor': 'white', 'linewidth': 1.5}
    )
    
    # 设置标题
    plt.title('待办事项优先级分布', fontsize=16)
    plt.axis('equal')  # 保证饼图是圆形的
    
    # 保存图表
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    filename = os.path.join(output_dir, "todos_priority_pie.png")
    plt.savefig(filename)
    plt.close()
    logger.info(f"待办事项优先级饼图已保存到 {filename}")
    
    return filename

def plot_todos_status_trend(df: pd.DataFrame, output_dir: str = "output") -> str:
    """绘制待办事项状态趋势图"""
    if df.empty:
        logger.warning("没有待办事项数据，无法生成趋势图")
        return ""
    
    # 转换日期列
    df['created_at'] = pd.to_datetime(df['created_at'])
    df['completed_at'] = pd.to_datetime(df['completed_at'])
    
    # 提取日期
    df['created_date'] = df['created_at'].dt.date
    df['completed_date'] = df['completed_at'].dt.date
    
    # 计算每天的待办创建和完成数量
    created_counts = df.groupby('created_date').size()
    completed_counts = df.dropna(subset=['completed_date']).groupby('completed_date').size()
    
    # 创建图表
    plt.figure(figsize=(14, 8))
    
    # 绘制双线图
    plt.plot(created_counts.index, created_counts.values, 
            marker='o', linestyle='-', color='blue', label='新建待办')
    plt.plot(completed_counts.index, completed_counts.values, 
            marker='s', linestyle='-', color='green', label='完成待办')
    
    # 设置标题和标签
    plt.title('待办事项创建和完成趋势', fontsize=16)
    plt.xlabel('日期', fontsize=12)
    plt.ylabel('数量', fontsize=12)
    plt.grid(True)
    plt.legend()
    
    # 计算累计创建和完成数量
    all_dates = sorted(set(list(created_counts.index) + list(completed_counts.index)))
    cumulative_created = []
    cumulative_completed = []
    running_created = 0
    running_completed = 0
    
    for date in all_dates:
        if date in created_counts:
            running_created += created_counts[date]
        if date in completed_counts:
            running_completed += completed_counts[date]
        
        cumulative_created.append(running_created)
        cumulative_completed.append(running_completed)
    
    # 添加第二个y轴
    ax2 = plt.gca().twinx()
    ax2.plot(all_dates, cumulative_created, 
            linestyle='--', color='darkblue', label='累计新建')
    ax2.plot(all_dates, cumulative_completed, 
            linestyle='--', color='darkgreen', label='累计完成')
    ax2.set_ylabel('累计数量', fontsize=12)
    ax2.legend(loc='upper right')
    
    # 保存图表
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    filename = os.path.join(output_dir, "todos_status_trend.png")
    plt.savefig(filename)
    plt.close()
    logger.info(f"待办事项状态趋势图已保存到 {filename}")
    
    return filename

def plot_productivity_calendar(habits_df: pd.DataFrame, todos_df: pd.DataFrame, 
                             output_dir: str = "output") -> str:
    """绘制生产力日历热力图"""
    if habits_df.empty and todos_df.empty:
        logger.warning("没有数据，无法生成生产力日历")
        return ""
    
    # 计算每天的生产力得分
    
    # 1. 习惯得分
    daily_habits = pd.DataFrame()
    if not habits_df.empty:
        habits_df['completion_date'] = pd.to_datetime(habits_df['completion_date'])
        daily_habits = habits_df.groupby(habits_df['completion_date'].dt.date).agg(
            habit_score=('is_completed', 'mean')
        ) * 100  # 转换为0-100分
    
    # 2. 待办得分
    daily_todos = pd.DataFrame()
    if not todos_df.empty:
        todos_df['completed_at'] = pd.to_datetime(todos_df['completed_at'])
        todos_df['date'] = todos_df['completed_at'].dt.date
        
        # 按日期分组
        daily_todos = todos_df.groupby('date').apply(
            lambda x: len(x[x['status'] == 'completed']) / len(x) if len(x) > 0 else 0
        ).to_frame('todo_score') * 100  # 转换为0-100分
    
    # 合并得分
    daily_scores = pd.DataFrame()
    if not daily_habits.empty and not daily_todos.empty:
        daily_scores = daily_habits.join(daily_todos, how='outer').fillna(0)
        daily_scores['productivity_score'] = daily_scores['habit_score'] * 0.4 + daily_scores['todo_score'] * 0.6
    elif not daily_habits.empty:
        daily_scores = daily_habits
        daily_scores['productivity_score'] = daily_scores['habit_score']
    elif not daily_todos.empty:
        daily_scores = daily_todos
        daily_scores['productivity_score'] = daily_scores['todo_score']
    
    if daily_scores.empty:
        logger.warning("无法计算生产力得分，日历热力图生成失败")
        return ""
    
    # 准备绘制日历热力图
    all_dates = daily_scores.index
    start_date = min(all_dates)
    end_date = max(all_dates)
    
    # 创建日期范围内的所有日期
    date_range = pd.date_range(start=start_date, end=end_date)
    date_df = pd.DataFrame(index=date_range.date)
    
    # 合并得分数据
    date_df = date_df.join(daily_scores[['productivity_score']], how='left').fillna(0)
    
    # 添加年、月、日、星期几列
    date_df['year'] = date_df.index.year
    date_df['month'] = date_df.index.month
    date_df['day'] = date_df.index.day
    date_df['weekday'] = date_df.index.weekday  # 0=周一, 6=周日
    
    # 准备日历数据
    calendar_data = []
    for year, year_data in date_df.groupby('year'):
        for month, month_data in year_data.groupby('month'):
            # 创建一个月的日历矩阵 (6行7列，对应6周，每周7天)
            month_calendar = np.zeros((6, 7))
            month_calendar.fill(np.nan)  # 用NaN填充
            
            # 填入数据
            for _, row in month_data.iterrows():
                # 计算该日期在日历中的位置
                day = row['day']
                weekday = row['weekday']
                
                # 计算第几周
                first_day = datetime(year, month, 1)
                first_weekday = first_day.weekday()
                week = (day + first_weekday - 1) // 7
                
                # 填入生产力得分
                month_calendar[week, weekday] = row['productivity_score']
            
            calendar_data.append({
                'year': year,
                'month': month,
                'calendar': month_calendar
            })
    
    # 绘制日历热力图
    month_names = ['一月', '二月', '三月', '四月', '五月', '六月', 
                  '七月', '八月', '九月', '十月', '十一月', '十二月']
    weekday_names = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    
    # 计算需要几行几列来显示所有月份
    n_months = len(calendar_data)
    n_cols = min(3, n_months)  # 每行最多3个月
    n_rows = (n_months + n_cols - 1) // n_cols
    
    plt.figure(figsize=(n_cols * 6, n_rows * 4))
    
    for i, month_data in enumerate(calendar_data):
        ax = plt.subplot(n_rows, n_cols, i + 1)
        
        # 绘制热力图
        sns.heatmap(
            month_data['calendar'],
            ax=ax,
            cmap='YlGnBu',
            vmin=0,
            vmax=100,
            cbar=i == 0,  # 只在第一个图上显示颜色条
            cbar_kws={'label': '生产力得分'},
            linewidths=0.5
        )
        
        # 设置标题和标签
        month_idx = month_data['month'] - 1
        ax.set_title(f"{month_data['year']}年 {month_names[month_idx]}")
        ax.set_yticklabels([f'第{i+1}周' for i in range(6)], rotation=0)
        ax.set_xticklabels(weekday_names, rotation=45)
    
    plt.tight_layout()
    
    # 保存图表
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    filename = os.path.join(output_dir, "productivity_calendar.png")
    plt.savefig(filename)
    plt.close()
    logger.info(f"生产力日历热力图已保存到 {filename}")
    
    return filename

def generate_charts(days=30, output_dir="output"):
    """生成所有图表"""
    logger.info(f"开始生成最近 {days} 天的数据图表...")
    
    # 获取数据
    date_range = get_date_range(days)
    start_date = date_range["start_date"].date()
    end_date = date_range["end_date"].date()
    
    habits_df = get_habits_data(start_date, end_date)
    todos_df = get_todos_data(start_date, end_date)
    
    # 保存原始数据
    save_dataframe_to_csv(habits_df, f"chart_habits_data.csv", output_dir)
    save_dataframe_to_csv(todos_df, f"chart_todos_data.csv", output_dir)
    
    # 生成图表
    chart_files = {}
    
    # 习惯数据图表
    if not habits_df.empty:
        chart_files['habits_completion_trend'] = plot_habits_completion_trend(habits_df, output_dir)
        chart_files['habits_heatmap'] = plot_habits_heatmap(habits_df, output_dir)
    
    # 待办事项图表
    if not todos_df.empty:
        chart_files['todos_priority_pie'] = plot_todos_priority_pie(todos_df, output_dir)
        chart_files['todos_status_trend'] = plot_todos_status_trend(todos_df, output_dir)
    
    # 生产力日历
    chart_files['productivity_calendar'] = plot_productivity_calendar(habits_df, todos_df, output_dir)
    
    # 保存图表信息
    chart_info = {
        "period": {
            "start_date": start_date.strftime('%Y-%m-%d'),
            "end_date": end_date.strftime('%Y-%m-%d'),
            "days": days
        },
        "charts": chart_files,
        "generated_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }
    
    # 保存图表信息到JSON
    info_file = os.path.join(output_dir, "chart_info.json")
    with open(info_file, 'w', encoding='utf-8') as f:
        json.dump(chart_info, f, ensure_ascii=False, indent=2, default=str)
    
    logger.info(f"数据图表生成完成，共 {len(chart_files)} 个图表")
    return chart_info

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='自定义图表生成器')
    parser.add_argument('--days', type=int, default=30,
                      help='数据天数范围')
    parser.add_argument('--output', default='output',
                      help='输出目录')
    parser.add_argument('--start-date',
                      help='开始日期 (YYYY-MM-DD)')
    parser.add_argument('--end-date',
                      help='结束日期 (YYYY-MM-DD)')
    
    args = parser.parse_args()
    
    try:
        start_date = None
        end_date = None
        
        if args.start_date and args.end_date:
            start_date = datetime.strptime(args.start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(args.end_date, '%Y-%m-%d').date()
            days = (end_date - start_date).days + 1
        else:
            days = args.days
        
        generate_charts(days, args.output)
        return 0
        
    except Exception as e:
        logger.error(f"生成图表出错: {str(e)}", exc_info=True)
        return 1

if __name__ == "__main__":
    import sys
    sys.exit(main())
