#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
每日数据洞察任务
分析昨天用户的所有数据，包括notes, pomodoro, tasks等，
并使用AI生成洞察报告，存储在ai_insights表中
"""
import logging
import pandas as pd
import json
import os
import argparse
import sys
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple

from db import db
from utils import get_yesterday, save_dataframe_to_csv, save_summary_to_json
from data_analysis import (
    analyze_habits_data, analyze_todos_data, 
    analyze_notes_data, analyze_pomodoros_data,
    combine_analysis_data
)
from ai_service import ai_service

logger = logging.getLogger(__name__)

def get_yesterday_habits_data(user_id: str, target_date: Optional[datetime] = None) -> pd.DataFrame:
    """获取指定日期的习惯数据"""
    date = target_date if target_date else get_yesterday()
    query = """
    SELECT 
        h.id, h.name, h.description, h.category, h.frequency,
        he.completed_at, he.status, he.comment, he.difficulty
    FROM habits h
    LEFT JOIN habit_entries he ON h.id = he.habit_id
    WHERE DATE(he.completed_at) = %(date)s
    AND h.user_id = %(user_id)s
    ORDER BY h.category, h.name
    """
    return db.query_to_dataframe(query, {"date": date.date(), "user_id": user_id})

def get_yesterday_todos(user_id: str, target_date: Optional[datetime] = None) -> pd.DataFrame:
    """获取指定日期的待办事项数据"""
    date = target_date if target_date else get_yesterday()
    query = """
    SELECT 
        id, title, description, status, priority, due_date, 
        completed_at, created_at, updated_at
    FROM todos
    WHERE (DATE(created_at) = %(date)s OR DATE(completed_at) = %(date)s OR DATE(updated_at) = %(date)s)
    AND user_id = %(user_id)s
    ORDER BY priority DESC, created_at
    """
    return db.query_to_dataframe(query, {"date": date.date(), "user_id": user_id})

def get_yesterday_notes(user_id: str, target_date: Optional[datetime] = None) -> pd.DataFrame:
    """获取指定日期的笔记数据"""
    date = target_date if target_date else get_yesterday()
    query = """
    SELECT 
        id, title, content, category, created_at, updated_at
    FROM notes
    WHERE (DATE(created_at) = %(date)s OR DATE(updated_at) = %(date)s)
    AND user_id = %(user_id)s
    ORDER BY created_at
    """
    return db.query_to_dataframe(query, {"date": date.date(), "user_id": user_id})

def get_yesterday_pomodoros(user_id: str, target_date: Optional[datetime] = None) -> pd.DataFrame:
    """获取指定日期的番茄钟数据"""
    date = target_date if target_date else get_yesterday()
    query = """
    SELECT 
        id, title, description, duration, status, 
        start_time, end_time, habit_id, todo_id, goal_id
    FROM pomodoros
    WHERE DATE(start_time) = %(date)s
    AND user_id = %(user_id)s
    ORDER BY start_time
    """
    return db.query_to_dataframe(query, {"date": date.date(), "user_id": user_id})

def get_yesterday_daily_summary(user_id: str, target_date: Optional[datetime] = None) -> Dict:
    """获取指定日期的每日总结数据"""
    date = target_date if target_date else get_yesterday()
    date_str = date.strftime('%Y-%m-%d')
    query = """
    SELECT 
        id, date, content, ai_summary, ai_feedback_actions
    FROM daily_summaries
    WHERE date = %(date)s
    AND user_id = %(user_id)s
    LIMIT 1
    """
    result = db.execute_query(query, {"date": date_str, "user_id": user_id})
    return result[0] if result else {}

def get_pomodoro_tags(user_id: str, pomodoro_ids: List[int]) -> Dict[int, List[Dict]]:
    """获取番茄钟关联的标签"""
    if not pomodoro_ids:
        return {}
    
    query = """
    SELECT 
        ptr.pomodoro_id, t.id, t.name, t.color
    FROM pomodoro_tag_relations ptr
    JOIN tags t ON ptr.tag_id = t.id
    WHERE ptr.pomodoro_id IN %(pomodoro_ids)s
    AND t.user_id = %(user_id)s
    """
    result = db.execute_query(query, {"pomodoro_ids": tuple(pomodoro_ids), "user_id": user_id})
    
    # 将结果整理为 {pomodoro_id: [tag1, tag2, ...]} 格式
    tags_by_pomodoro = {}
    for row in result:
        pomodoro_id = row['pomodoro_id']
        if pomodoro_id not in tags_by_pomodoro:
            tags_by_pomodoro[pomodoro_id] = []
        tags_by_pomodoro[pomodoro_id].append({
            'id': row['id'],
            'name': row['name'],
            'color': row['color']
        })
    
    return tags_by_pomodoro

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

def create_ai_insight_for_user(user_id: str, analysis_data: Dict[str, Any], target_date: Optional[datetime] = None, force: bool = False) -> Dict[str, Any]:
    """
    为用户创建AI洞察，将分析数据发送到AI服务并存储结果
    """
    date = target_date if target_date else get_yesterday()
    date_str = date.strftime('%Y-%m-%d')
    
    # 准备洞察数据结构
    insight_data = {
        "user_id": user_id,
        "kind": "daily_summary",
        "title": f"{date_str} 每日数据分析",
        "time_period_start": date.isoformat(),
        "time_period_end": date.isoformat(),
        "content": json.dumps(analysis_data, ensure_ascii=False),  # 先保存原始数据
        "metadata": {
            "date": date_str,
            "data_sources": ["habits", "todos", "notes", "pomodoros", "daily_summaries"]
        }
    }
    
    # 尝试使用OpenAI API来生成分析
    try:
        # 从环境变量获取OpenAI配置
        openai_api_key = os.getenv("OPENAI_API_KEY")
        openai_base_url = os.getenv("OPENAI_URL")
        openai_models_str = os.getenv("OPENAI_MODELS")
        
        if not all([openai_api_key, openai_base_url, openai_models_str]):
            logger.error("缺少OpenAI配置信息，请检查.env文件")
            sys.exit(1)
        
        # 从逗号分隔的模型列表中随机选择一个
        import random
        openai_model = random.choice([m.strip() for m in openai_models_str.split(",")])
        
        # 初始化OpenAI客户端
        try:
            from openai import OpenAI
            
            client = OpenAI(
                api_key=openai_api_key,
                base_url=openai_base_url
            )
            
            # 准备系统提示和用户提示
            system_prompt = """
            你是一个专业的个人数据分析师，擅长从用户的习惯、待办事项、笔记和番茄钟数据中提取有价值的洞察。
            你的任务是分析用户的数据，并生成一份详细的每日洞察报告。
            请从以下几个方面进行分析：
            1. 数据概览：简要总结当天的关键数据点
            2. 习惯完成情况：分析习惯的完成率和模式
            3. 待办事项分析：待办事项的完成情况和优先级处理
            4. 番茄钟专注时间分析：专注时间分布和效率
            5. 笔记内容分析：笔记的主题和关键点
            6. 改进建议：基于数据提出具体的改进建议
            7. 今日亮点：用户表现出色的地方
            
            请以第二人称（"你"）向用户提供分析，语气友好、专业且富有鼓励性。
            将分析结果以易于阅读的Markdown格式返回。
            """
            
            user_prompt = f"""
            以下是用户ID为 {user_id} 在 {date_str} 的数据分析结果。
            请分析这些数据并生成一份每日洞察报告。
            
            数据:
            ```json
            {json.dumps(analysis_data, ensure_ascii=False, indent=2)}
            ```
            """
            
            # 调用OpenAI API
            response = client.chat.completions.create(
                model=openai_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.5,
                max_tokens=1500
            )
            
            # 提取AI响应内容
            content = response.choices[0].message.content
            if content is None:
                content = "AI未能生成有效内容"
            else:
                content = content.strip()
            
            # 构建结构化的返回格式
            content_json = {
                "summary": "AI生成的每日洞察报告",
                "report": content,
                "date": date_str,
                "userId": user_id
            }
            
            # 使用AI生成的内容更新洞察
            insight_data["content"] = content
            insight_data["content_json"] = content_json
            logger.info(f"AI分析成功生成: {date_str}")
            
        except Exception as e:
            error_msg = f"OpenAI API调用失败: {str(e)}"
            logger.error(error_msg)
            sys.exit(1)  # 出错直接退出
            
    except Exception as e:
        error_msg = f"准备AI分析服务失败: {str(e)}"
        logger.error(error_msg)
        sys.exit(1)  # 出错直接退出
    
    # 将数据存储到数据库
    try:
        # 检查是否已存在该用户的该日洞察
        check_query = """
        SELECT id FROM ai_insights
        WHERE user_id = %(user_id)s 
        AND kind = 'daily_summary'
        AND DATE(time_period_start) = %(date)s
        """
        existing = db.execute_query(check_query, {"user_id": user_id, "date": date.date()})
        
        if existing:
            # 更新现有记录
            update_query = """
            UPDATE ai_insights
            SET title = %(title)s,
                content = %(content)s,
                content_json = %(content_json)s,
                metadata = %(metadata)s,
                updated_at = NOW()
            WHERE id = %(id)s
            RETURNING id
            """
            result = db.execute_query(
                update_query, 
                {
                    "id": existing[0]['id'],
                    "title": insight_data["title"],
                    "content": insight_data["content"],
                    "content_json": json.dumps(insight_data.get("content_json", {})),
                    "metadata": json.dumps(insight_data["metadata"])
                }
            )
            logger.info(f"更新了用户 {user_id} 的每日洞察 (ID: {result[0]['id']})")
            return {"success": True, "id": result[0]['id'], "operation": "update"}
        else:
            # 创建新记录
            insert_query = """
            INSERT INTO ai_insights (
                user_id, kind, title, content, content_json,
                time_period_start, time_period_end, metadata, created_at, updated_at
            )
            VALUES (
                %(user_id)s, %(kind)s, %(title)s, %(content)s, %(content_json)s,
                %(time_period_start)s, %(time_period_end)s, %(metadata)s, NOW(), NOW()
            )
            RETURNING id
            """
            result = db.execute_query(
                insert_query, 
                {
                    "user_id": insight_data["user_id"],
                    "kind": insight_data["kind"],
                    "title": insight_data["title"],
                    "content": insight_data["content"],
                    "content_json": json.dumps(insight_data.get("content_json", {})),
                    "time_period_start": insight_data["time_period_start"],
                    "time_period_end": insight_data["time_period_end"],
                    "metadata": json.dumps(insight_data["metadata"])
                }
            )
            logger.info(f"创建了用户 {user_id} 的每日洞察 (ID: {result[0]['id']})")
            return {"success": True, "id": result[0]['id'], "operation": "create"}
    except Exception as e:
        logger.error(f"存储AI洞察失败: {str(e)}")
        return {"success": False, "error": str(e)}

def get_active_users() -> List[str]:
    """
    获取活跃用户列表(最近30天有数据的用户)
    """
    query = """
    WITH active_users AS (
        -- 习惯活跃用户
        SELECT DISTINCT user_id FROM habits 
        WHERE created_at >= NOW() - INTERVAL '30 days'
        UNION
        -- 待办事项活跃用户
        SELECT DISTINCT user_id FROM todos 
        WHERE created_at >= NOW() - INTERVAL '30 days'
        UNION
        -- 笔记活跃用户
        SELECT DISTINCT user_id FROM notes 
        WHERE created_at >= NOW() - INTERVAL '30 days'
        UNION
        -- 番茄钟活跃用户
        SELECT DISTINCT user_id FROM pomodoros 
        WHERE created_at >= NOW() - INTERVAL '30 days'
    )
    SELECT user_id FROM active_users
    """
    result = db.execute_query(query)
    return [row['user_id'] for row in result]

def generate_daily_insights(user_id: Optional[str] = None, target_date: Optional[str] = None, force: bool = False, use_chain: bool = False) -> Dict[str, Any]:
    """
    为用户生成每日洞察报告
    
    参数:
        user_id: 指定用户ID，如果不指定则处理所有活跃用户
        target_date: 指定目标日期(YYYY-MM-DD格式)，如果不指定则使用昨天
        force: 是否强制重新生成已存在的洞察
        
    返回:
        包含处理结果信息的字典
    """
    # 处理日期参数
    if target_date:
        try:
            date = datetime.strptime(target_date, '%Y-%m-%d')
        except ValueError:
            logger.error(f"日期格式无效: {target_date}，应为YYYY-MM-DD格式")
            return {"success": False, "error": f"日期格式无效: {target_date}"}
    else:
        date = get_yesterday()
    
    date_str = date.strftime('%Y-%m-%d')
    
    logger.info(f"开始为 {date_str} 生成每日洞察...")
    
    # 获取要处理的用户列表
    if user_id:
        # 如果指定了用户ID，只处理该用户
        users_to_process = [user_id]
        logger.info(f"将只处理用户 {user_id} 的数据")
    else:
        # 否则处理所有活跃用户
        users_to_process = get_active_users()
        logger.info(f"找到 {len(users_to_process)} 名活跃用户")
    
    results = {
        "date": date_str,
        "total_users": len(users_to_process),
        "success_count": 0,
        "error_count": 0,
        "user_results": {}
    }
    
    # 为每个用户生成洞察
    for current_user_id in users_to_process:
        try:
            logger.info(f"正在处理用户 {current_user_id} 的数据...")
            
            # 获取各类数据
            habits_df = get_yesterday_habits_data(current_user_id, date)
            todos_df = get_yesterday_todos(current_user_id, date)
            notes_df = get_yesterday_notes(current_user_id, date)
            pomodoros_df = get_yesterday_pomodoros(current_user_id, date)
            daily_summary = get_yesterday_daily_summary(current_user_id, date)
            
            # 获取番茄钟标签数据
            pomodoro_ids = pomodoros_df['id'].tolist() if not pomodoros_df.empty else []
            pomodoro_tags = get_pomodoro_tags(current_user_id, pomodoro_ids)
            
            # 分析数据
            habits_analysis = analyze_habits_data(habits_df)
            todos_analysis = analyze_todos_data(todos_df)
            notes_analysis = analyze_notes_data(notes_df)
            pomodoros_analysis = analyze_pomodoros_data(pomodoros_df, pomodoro_tags)
            
            # 整合所有数据
            combined_analysis = combine_analysis_data(
                current_user_id,
                date_str,
                habits_analysis,
                todos_analysis,
                notes_analysis,
                pomodoros_analysis,
                daily_summary
            )
            
            # 保存分析结果用于调试
            debug_filename = f"daily_insight_{current_user_id}_{date_str}.json"
            save_summary_to_json(combined_analysis, debug_filename)
            
            # 如果有数据，创建AI洞察
            if combined_analysis["overall"]["has_data"]:
                    # 使用传统方式分析
                insight_result = create_ai_insight_for_user(current_user_id, combined_analysis, date, force)
                    
                results["user_results"][current_user_id] = insight_result
                if insight_result.get("success", False):
                    results["success_count"] += 1
                else:
                    results["error_count"] += 1
                    logger.error(f"为用户 {current_user_id} 创建洞察失败: {insight_result.get('error')}")
            else:
                logger.info(f"用户 {current_user_id} 在 {date_str} 没有数据，跳过创建洞察")
                results["user_results"][current_user_id] = {"success": False, "reason": "no_data"}
        except Exception as e:
            logger.error(f"处理用户 {current_user_id} 数据时出错: {str(e)}")
            results["error_count"] += 1
            results["user_results"][current_user_id] = {"success": False, "error": str(e)}
    
    logger.info(f"完成 {date_str} 的每日洞察生成: 成功 {results['success_count']}, 失败 {results['error_count']}")
    return results

if __name__ == "__main__":
    # 解析命令行参数
    parser = argparse.ArgumentParser(description='生成每日数据洞察')
    parser.add_argument('--user-id', help='用户ID，不指定则处理所有活跃用户')
    parser.add_argument('--date', help='指定日期(YYYY-MM-DD)，默认为昨天')
    parser.add_argument('--force', action='store_true', help='强制重新生成已存在的洞察')
    parser.add_argument('--chain', action='store_true', help='使用链式分析模式，分步骤处理不同数据类型')
    args = parser.parse_args()
    
    results = generate_daily_insights(
        user_id=args.user_id,
        target_date=args.date,
        force=args.force,
        use_chain=args.chain
    )
    print(f"每日洞察生成完成: 成功 {results['success_count']}/{results['total_users']}")
