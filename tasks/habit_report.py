#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
习惯打卡统计报告生成脚本

使用HabitStatsService生成习惯统计报告并输出为图表和摘要文件。
可以单独运行或者通过main.py集成调用。
"""

import os
import json
import argparse
import datetime
from datetime import timedelta
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from habit_stats import HabitStatsService
from db import get_db_connection

# 设置matplotlib中文字体支持
try:
    plt.rcParams['font.sans-serif'] = ['SimHei', 'DejaVu Sans', 'Bitstream Vera Sans', 'sans-serif']
    plt.rcParams['axes.unicode_minus'] = False  # 解决负号显示问题
except:
    print("警告: 未能正确设置中文字体，图表中的中文可能无法正确显示")


def create_output_dir():
    """创建输出目录"""
    output_dir = os.path.join(os.path.dirname(__file__), 'output')
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    return output_dir


def generate_habit_completion_trend(stats_service, user_id, days=30):
    """生成习惯完成率趋势图"""
    # 获取用户所有习惯的统计数据
    habits_stats = stats_service.get_all_user_stats(user_id)
    
    if not habits_stats:
        print("没有找到习惯数据")
        return None
    
    # 获取日期范围
    end_date = datetime.datetime.now().date()
    start_date = end_date - timedelta(days=days-1)
    
    # 计算日期范围内每个习惯的打卡情况
    habit_data = []
    
    for habit in habits_stats:
        habit_id = habit['habit_id']
        habit_name = habit['name']
        
        # 获取详细打卡记录
        entries = stats_service.get_entries_by_habit_id(habit_id, user_id)
        
        # 按日期统计
        daily_stats = {}
        current_date = start_date
        while current_date <= end_date:
            date_str = current_date.strftime('%Y-%m-%d')
            daily_stats[date_str] = {
                'date': date_str,
                'habit_name': habit_name,
                'completed': 0  # 默认为未完成
            }
            current_date += timedelta(days=1)
        
        # 标记已完成的日期
        for entry in entries:
            if entry.get('status') != 'failed':
                completed_date = entry['completed_at'].strftime('%Y-%m-%d') if isinstance(entry['completed_at'], datetime.datetime) else datetime.datetime.fromisoformat(entry['completed_at'].replace('Z', '+00:00')).strftime('%Y-%m-%d')
                
                if completed_date in daily_stats:
                    daily_stats[completed_date]['completed'] = 1
        
        # 添加到数据集
        habit_data.extend(daily_stats.values())
    
    # 创建DataFrame
    df = pd.DataFrame(habit_data)
    
    if df.empty:
        print("没有足够的数据来生成趋势图")
        return None
    
    # 数据透视表
    pivot_df = df.pivot_table(
        index='date',
        columns='habit_name',
        values='completed', 
        aggfunc='sum'
    ).fillna(0)
    
    # 计算每日总完成率
    pivot_df['总完成率'] = pivot_df.mean(axis=1) * 100
    
    # 生成趋势图
    plt.figure(figsize=(15, 8))
    
    # 绘制每个习惯的完成情况
    ax1 = plt.subplot(111)
    for habit_name in pivot_df.columns:
        if habit_name != '总完成率':
            ax1.plot(pivot_df.index, pivot_df[habit_name], 'o-', label=habit_name, alpha=0.6)
    
    # 绘制总完成率
    ax2 = ax1.twinx()
    ax2.plot(pivot_df.index, pivot_df['总完成率'], 'r-', linewidth=2, label='总完成率')
    ax2.fill_between(pivot_df.index, pivot_df['总完成率'], alpha=0.2, color='r')
    ax2.set_ylim([0, 100])
    
    # 设置图表
    plt.title(f'过去{days}天习惯完成趋势')
    ax1.set_xlabel('日期')
    ax1.set_ylabel('完成情况 (1=完成, 0=未完成)')
    ax2.set_ylabel('总完成率 (%)')
    
    # 调整x轴日期标签
    if len(pivot_df) > 14:
        interval = len(pivot_df) // 7  # 只显示约7个日期标签
        plt.xticks(range(0, len(pivot_df), interval), pivot_df.index[::interval], rotation=45)
    else:
        plt.xticks(rotation=45)
    
    # 合并图例
    lines1, labels1 = ax1.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax1.legend(lines1 + lines2, labels1 + labels2, loc='upper left', bbox_to_anchor=(0, -0.12), ncol=3)
    
    plt.tight_layout()
    
    # 保存图表
    output_dir = create_output_dir()
    output_file = os.path.join(output_dir, f'habit_completion_trend_{days}d.png')
    plt.savefig(output_file, dpi=300, bbox_inches='tight')
    plt.close()
    
    return output_file


def generate_habit_heatmap(stats_service, user_id, weeks=10):
    """生成习惯完成热力图（按周显示）"""
    # 获取用户所有习惯的统计数据
    habits_stats = stats_service.get_all_user_stats(user_id)
    
    if not habits_stats:
        print("没有找到习惯数据")
        return None
    
    # 获取日期范围（按周）
    end_date = datetime.datetime.now().date()
    start_date = end_date - timedelta(days=weeks*7)
    
    all_entries = []
    habit_names = []
    
    # 收集所有习惯的打卡数据
    for habit in habits_stats:
        habit_id = habit['habit_id']
        habit_name = habit['name']
        habit_names.append(habit_name)
        
        # 获取详细打卡记录
        entries = stats_service.get_entries_by_habit_id(habit_id, user_id)
        
        for entry in entries:
            if entry.get('status') != 'failed':
                completed_date = entry['completed_at'] if isinstance(entry['completed_at'], datetime.datetime) else datetime.datetime.fromisoformat(entry['completed_at'].replace('Z', '+00:00'))
                
                if completed_date.date() >= start_date:
                    all_entries.append({
                        'date': completed_date.date(),
                        'weekday': completed_date.weekday(),  # 0=周一，6=周日
                        'week': (completed_date.date() - start_date).days // 7,
                        'habit_name': habit_name,
                        'completed': 1
                    })
    
    if not all_entries:
        print("没有足够的数据来生成热力图")
        return None
    
    # 转换为DataFrame
    df = pd.DataFrame(all_entries)
    
    # 每个习惯单独生成一个热力图
    for habit_name in habit_names:
        habit_df = df[df['habit_name'] == habit_name].copy()
        
        if habit_df.empty:
            continue
            
        # 数据透视表
        pivot_df = habit_df.pivot_table(
            index='week', 
            columns='weekday',
            values='completed',
            aggfunc='sum'
        ).fillna(0)
        
        # 周数可能不连续，确保数据有序
        all_weeks = range(weeks)
        for week in all_weeks:
            if week not in pivot_df.index:
                pivot_df.loc[week] = 0
        
        pivot_df = pivot_df.sort_index()
        
        # 调整周几显示
        pivot_df = pivot_df.reindex(columns=range(7))
        pivot_df.columns = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
        
        # 生成热力图
        plt.figure(figsize=(10, 6))
        sns.heatmap(pivot_df, cmap='YlGnBu', linewidths=.5, 
                   cbar_kws={'label': '打卡次数'})
        
        plt.title(f'{habit_name} 每周打卡情况')
        plt.xlabel('')
        plt.ylabel('过去几周')
        
        # Y轴标签（倒序显示周数）
        week_labels = [f'{i+1}周前' if i > 0 else '本周' for i in range(len(pivot_df))]
        plt.yticks(np.arange(0.5, len(pivot_df), 1), week_labels[::-1])
        
        plt.tight_layout()
        
        # 保存图表
        output_dir = create_output_dir()
        output_file = os.path.join(output_dir, f'habit_heatmap_{habit_name}.png')
        plt.savefig(output_file, dpi=300, bbox_inches='tight')
        plt.close()
    
    # 合并所有习惯的热力图
    habit_counts = df.groupby(['week', 'weekday', 'date']).size().reset_index(name='count')
    
    # 计算每天完成的习惯数量
    date_pivot = habit_counts.pivot_table(
        index='week', 
        columns='weekday',
        values='count',
        aggfunc='sum'
    ).fillna(0)
    
    # 确保数据有序
    for week in all_weeks:
        if week not in date_pivot.index:
            date_pivot.loc[week] = 0
    
    date_pivot = date_pivot.sort_index()
    
    # 调整周几显示
    date_pivot = date_pivot.reindex(columns=range(7))
    date_pivot.columns = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    
    # 生成热力图
    plt.figure(figsize=(12, 7))
    sns.heatmap(date_pivot, cmap='YlGnBu', linewidths=.5, 
               cbar_kws={'label': '完成习惯数量'})
    
    plt.title(f'每周习惯完成总量热力图')
    plt.xlabel('')
    plt.ylabel('过去几周')
    
    # Y轴标签（倒序显示周数）
    week_labels = [f'{i+1}周前' if i > 0 else '本周' for i in range(len(date_pivot))]
    plt.yticks(np.arange(0.5, len(date_pivot), 1), week_labels[::-1])
    
    plt.tight_layout()
    
    # 保存图表
    output_dir = create_output_dir()
    output_file = os.path.join(output_dir, f'habit_heatmap_all.png')
    plt.savefig(output_file, dpi=300, bbox_inches='tight')
    plt.close()
    
    return output_file


def generate_habit_streak_chart(stats_service, user_id):
    """生成习惯连续打卡天数图表"""
    # 获取用户所有习惯的统计数据
    habits_stats = stats_service.get_all_user_stats(user_id)
    
    if not habits_stats:
        print("没有找到习惯数据")
        return None
    
    # 创建DataFrame
    df = pd.DataFrame(habits_stats)
    
    if df.empty:
        print("没有习惯数据")
        return None
    
    # 只选择需要的列
    plot_df = df[['name', 'current_streak', 'longest_streak']].copy()
    
    # 按当前连续天数排序
    plot_df = plot_df.sort_values('current_streak', ascending=False)
    
    # 如果习惯数量多于10个，只显示前10个
    if len(plot_df) > 10:
        plot_df = plot_df.head(10)
    
    # 数据准备
    habits = plot_df['name']
    current_streaks = plot_df['current_streak']
    longest_streaks = plot_df['longest_streak']
    
    # 创建图表
    plt.figure(figsize=(12, 8))
    
    # 设置条形宽度
    bar_width = 0.35
    x = np.arange(len(habits))
    
    # 绘制当前连续天数和最长连续天数的条形图
    plt.bar(x - bar_width/2, current_streaks, bar_width, label='当前连续天数', color='#3498db')
    plt.bar(x + bar_width/2, longest_streaks, bar_width, label='最长连续天数', color='#e74c3c')
    
    # 添加标签和标题
    plt.xlabel('习惯名称')
    plt.ylabel('连续天数')
    plt.title('习惯连续打卡天数对比')
    plt.xticks(x, habits, rotation=45, ha='right')
    plt.legend()
    
    # 添加数值标签
    for i, v in enumerate(current_streaks):
        plt.text(i - bar_width/2, v + 0.1, str(v), ha='center')
    
    for i, v in enumerate(longest_streaks):
        plt.text(i + bar_width/2, v + 0.1, str(v), ha='center')
    
    plt.tight_layout()
    
    # 保存图表
    output_dir = create_output_dir()
    output_file = os.path.join(output_dir, 'habit_streaks.png')
    plt.savefig(output_file, dpi=300, bbox_inches='tight')
    plt.close()
    
    return output_file


def generate_completion_rate_chart(stats_service, user_id):
    """生成习惯完成率饼图"""
    # 获取用户所有习惯的统计数据
    habits_stats = stats_service.get_all_user_stats(user_id)
    
    if not habits_stats:
        print("没有找到习惯数据")
        return None
    
    # 创建DataFrame
    df = pd.DataFrame(habits_stats)
    
    if df.empty:
        print("没有习惯数据")
        return None
    
    # 按完成率分组
    ranges = [0, 25, 50, 75, 90, 100]
    labels = ['0-25%', '25-50%', '50-75%', '75-90%', '90-100%']
    
    df['range'] = pd.cut(df['completion_rate'], bins=ranges, labels=labels, right=True)
    completion_counts = df['range'].value_counts().sort_index()
    
    # 饼图数据
    labels_with_count = [f'{label} ({count})' for label, count in zip(completion_counts.index, completion_counts)]
    
    # 颜色映射
    colors = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#27ae60']
    
    # 创建饼图
    plt.figure(figsize=(10, 8))
    patches, texts, autotexts = plt.pie(
        completion_counts, 
        labels=labels_with_count,
        autopct='%1.1f%%',
        startangle=90,
        colors=colors,
        explode=[0.05] * len(completion_counts),
        shadow=True
    )
    
    # 设置字体大小
    for autotext in autotexts:
        autotext.set_fontsize(12)
    
    # 添加标题
    plt.title('习惯完成率分布', fontsize=16, pad=20)
    plt.axis('equal')
    
    # 保存图表
    output_dir = create_output_dir()
    output_file = os.path.join(output_dir, 'habit_completion_rate.png')
    plt.savefig(output_file, dpi=300, bbox_inches='tight')
    plt.close()
    
    return output_file


def generate_habit_report(user_id, days=30, output_format='json'):
    """生成习惯统计报告"""
    output_dir = create_output_dir()
    
    with HabitStatsService() as service:
        # 更新所有习惯统计数据
        service.update_all_user_stats(user_id)
        
        # 生成报告数据
        report = service.generate_stats_report(user_id)
        
        # 生成图表
        chart_files = []
        
        try:
            trend_chart = generate_habit_completion_trend(service, user_id, days)
            if trend_chart:
                chart_files.append(trend_chart)
            
            heatmap_chart = generate_habit_heatmap(service, user_id)
            if heatmap_chart:
                chart_files.append(heatmap_chart)
                
            streak_chart = generate_habit_streak_chart(service, user_id)
            if streak_chart:
                chart_files.append(streak_chart)
                
            rate_chart = generate_completion_rate_chart(service, user_id)
            if rate_chart:
                chart_files.append(rate_chart)
        except Exception as e:
            print(f"生成图表时出错: {str(e)}")
        
        # 保存报告数据
        if output_format == 'json' or output_format == 'all':
            report_file = os.path.join(output_dir, 'habit_report.json')
            with open(report_file, 'w', encoding='utf-8') as f:
                json.dump(report, f, ensure_ascii=False, indent=2, default=str)
        
        # 生成CSV报告
        if output_format == 'csv' or output_format == 'all':
            # 获取详细数据
            habits_stats = service.get_all_user_stats(user_id)
            if habits_stats:
                csv_file = os.path.join(output_dir, 'habit_stats.csv')
                df = pd.DataFrame(habits_stats)
                df.to_csv(csv_file, index=False, encoding='utf-8')
        
        return {
            'report': report,
            'charts': chart_files
        }


def main():
    parser = argparse.ArgumentParser(description='习惯打卡统计报告生成工具')
    parser.add_argument('user_id', help='用户ID')
    parser.add_argument('--days', type=int, default=30, help='分析的天数 (默认: 30)')
    parser.add_argument('--format', choices=['json', 'csv', 'all'], default='all', 
                        help='输出格式 (默认: all)')
    parser.add_argument('--update-only', action='store_true', 
                        help='只更新统计数据，不生成报告')
    
    args = parser.parse_args()
    
    with HabitStatsService() as service:
        if args.update_only:
            updated = service.update_all_user_stats(args.user_id)
            print(f"已更新 {updated} 个习惯的统计数据")
        else:
            result = generate_habit_report(args.user_id, args.days, args.format)
            print(f"报告生成完成: {result['charts']}")
    
    return 0


if __name__ == "__main__":
    import sys
    sys.exit(main())
