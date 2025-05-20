import logging
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import pytz
from typing import Dict, List, Any, Optional
import json
import os
from config import config

# 配置日志
logging.basicConfig(
    level=getattr(logging, config.log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def get_yesterday() -> datetime:
    """获取昨天的日期"""
    tz = pytz.timezone(config.timezone)
    today = datetime.now(tz)
    yesterday = today - timedelta(days=1)
    return yesterday.replace(hour=0, minute=0, second=0, microsecond=0)

def get_date_range(days: int = 7) -> Dict[str, datetime]:
    """获取日期范围，默认过去7天"""
    tz = pytz.timezone(config.timezone)
    today = datetime.now(tz).replace(hour=0, minute=0, second=0, microsecond=0)
    start_date = today - timedelta(days=days)
    return {
        "start_date": start_date,
        "end_date": today
    }

def save_dataframe_to_csv(df: pd.DataFrame, filename: str, output_dir: str = "output") -> str:
    """保存DataFrame到CSV文件"""
    # 确保输出目录存在
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # 构建完整文件路径
    filepath = os.path.join(output_dir, filename)
    
    # 保存DataFrame到CSV
    df.to_csv(filepath, index=False, encoding='utf-8')
    logger.info(f"已保存数据到 {filepath}")
    
    return filepath

def save_summary_to_json(summary: Dict[str, Any], filename: str, output_dir: str = "output") -> str:
    """保存摘要信息到JSON文件"""
    # 确保输出目录存在
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # 构建完整文件路径
    filepath = os.path.join(output_dir, filename)
    
    # 保存摘要到JSON
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2, default=str)
    logger.info(f"已保存摘要到 {filepath}")
    
    return filepath
