#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库探索和验证工具
用于检查数据库中的表结构、数据量等信息
"""
import logging
import pandas as pd
from tabulate import tabulate
import argparse
import json
from typing import Dict, List, Any, Optional

from db import db
from config import config

# 配置日志
logging.basicConfig(
    level=getattr(logging, config.log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def list_tables() -> List[str]:
    """列出数据库中所有表"""
    query = """
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name
    """
    result = db.execute_query(query)
    return [row['table_name'] for row in result]

def get_table_schema(table_name: str) -> List[Dict[str, Any]]:
    """获取表结构"""
    query = """
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = %s
    ORDER BY ordinal_position
    """
    return db.execute_query(query, {'table_name': table_name})

def get_table_stats(table_name: str) -> Dict[str, Any]:
    """获取表统计信息"""
    # 获取行数
    count_query = f"SELECT COUNT(*) as count FROM {table_name}"
    count_result = db.execute_query(count_query)[0]['count']
    
    # 获取表大小
    size_query = f"""
    SELECT pg_size_pretty(pg_total_relation_size('{table_name}')) as size,
           pg_total_relation_size('{table_name}') as size_bytes
    """
    size_result = db.execute_query(size_query)[0]
    
    return {
        "table_name": table_name,
        "row_count": count_result,
        "table_size": size_result['size'],
        "size_bytes": size_result['size_bytes']
    }

def get_column_stats(table_name: str, column_name: str, data_type: str) -> Dict[str, Any]:
    """获取列统计信息"""
    stats = {"column_name": column_name, "data_type": data_type}
    
    # 只对特定类型的列进行统计
    if data_type in ('integer', 'bigint', 'decimal', 'numeric', 'real', 'double precision'):
        query = f"""
        SELECT 
            MIN({column_name}) as min_value,
            MAX({column_name}) as max_value,
            AVG({column_name}) as avg_value,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY {column_name}) as median
        FROM {table_name}
        WHERE {column_name} IS NOT NULL
        """
        try:
            result = db.execute_query(query)
            if result:
                stats.update(result[0])
        except Exception as e:
            logger.warning(f"无法获取列 {column_name} 的统计信息: {str(e)}")
    
    elif data_type in ('character varying', 'text', 'varchar', 'char'):
        # 统计非空值数量和唯一值数量
        query = f"""
        SELECT 
            COUNT({column_name}) as non_null_count,
            COUNT(DISTINCT {column_name}) as unique_count,
            MIN(LENGTH({column_name})) as min_length,
            MAX(LENGTH({column_name})) as max_length,
            AVG(LENGTH({column_name})) as avg_length
        FROM {table_name}
        """
        try:
            result = db.execute_query(query)
            if result:
                stats.update(result[0])
        except Exception as e:
            logger.warning(f"无法获取列 {column_name} 的统计信息: {str(e)}")
    
    # 统计NULL值数量
    null_query = f"""
    SELECT COUNT(*) as null_count
    FROM {table_name}
    WHERE {column_name} IS NULL
    """
    try:
        null_result = db.execute_query(null_query)
        if null_result:
            stats["null_count"] = null_result[0]['null_count']
    except Exception as e:
        logger.warning(f"无法获取列 {column_name} 的NULL值数量: {str(e)}")
    
    return stats

def analyze_table(table_name: str, sample_size: int = 5) -> Dict[str, Any]:
    """分析表结构和数据"""
    # 获取表结构
    schema = get_table_schema(table_name)
    
    # 获取表统计信息
    stats = get_table_stats(table_name)
    
    # 获取每列的统计信息
    column_stats = []
    for column in schema:
        col_stats = get_column_stats(
            table_name, 
            column['column_name'], 
            column['data_type']
        )
        column_stats.append(col_stats)
    
    # 获取样本数据
    sample_query = f"SELECT * FROM {table_name} LIMIT {sample_size}"
    sample_data = db.execute_query(sample_query)
    
    return {
        "table_name": table_name,
        "schema": schema,
        "stats": stats,
        "column_stats": column_stats,
        "sample_data": sample_data
    }

def display_table_list(tables: List[str]) -> None:
    """显示表列表"""
    print("\n=== 数据库表列表 ===")
    for i, table in enumerate(tables, 1):
        print(f"{i}. {table}")
    print(f"\n共 {len(tables)} 个表")

def display_table_schema(schema: List[Dict[str, Any]]) -> None:
    """显示表结构"""
    print("\n=== 表结构 ===")
    headers = ["列名", "数据类型", "可空", "默认值"]
    rows = [[
        col['column_name'],
        col['data_type'],
        col['is_nullable'],
        col['column_default'] or ''
    ] for col in schema]
    print(tabulate(rows, headers=headers, tablefmt="grid"))

def display_table_stats(stats: Dict[str, Any]) -> None:
    """显示表统计信息"""
    print("\n=== 表统计 ===")
    print(f"行数: {stats['row_count']}")
    print(f"表大小: {stats['table_size']}")

def display_column_stats(column_stats: List[Dict[str, Any]]) -> None:
    """显示列统计信息"""
    print("\n=== 列统计 ===")
    for col in column_stats:
        print(f"\n>> {col['column_name']} ({col['data_type']})")
        
        # 显示数值型列的统计信息
        if 'min_value' in col:
            print(f"  最小值: {col['min_value']}")
            print(f"  最大值: {col['max_value']}")
            print(f"  平均值: {col['avg_value']}")
            print(f"  中位数: {col['median']}")
        
        # 显示字符串列的统计信息
        if 'min_length' in col:
            print(f"  最小长度: {col['min_length']}")
            print(f"  最大长度: {col['max_length']}")
            print(f"  平均长度: {col['avg_length']}")
            print(f"  唯一值数量: {col['unique_count']}")
        
        # 显示NULL值数量
        if 'null_count' in col:
            print(f"  NULL值数量: {col['null_count']}")

def display_sample_data(sample_data: List[Dict[str, Any]]) -> None:
    """显示样本数据"""
    if not sample_data:
        print("\n=== 样本数据 ===\n无数据")
        return
    
    print("\n=== 样本数据 ===")
    headers = list(sample_data[0].keys())
    rows = []
    for row in sample_data:
        row_values = []
        for key in headers:
            # 处理复杂类型显示
            if isinstance(row[key], dict) or isinstance(row[key], list):
                value = json.dumps(row[key], ensure_ascii=False)[:50] + '...' if len(json.dumps(row[key])) > 50 else json.dumps(row[key], ensure_ascii=False)
            elif isinstance(row[key], str) and len(row[key]) > 50:
                value = row[key][:50] + '...'
            else:
                value = row[key]
            row_values.append(value)
        rows.append(row_values)
    
    print(tabulate(rows, headers=headers, tablefmt="grid"))

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='数据库探索和验证工具')
    parser.add_argument('--table', help='要分析的表名')
    parser.add_argument('--list', action='store_true', help='列出所有表')
    parser.add_argument('--sample', type=int, default=5, help='样本数据行数')
    parser.add_argument('--output', help='将结果保存到JSON文件')
    
    args = parser.parse_args()
    
    try:
        if args.list:
            tables = list_tables()
            display_table_list(tables)
            
            if args.output:
                with open(args.output, 'w', encoding='utf-8') as f:
                    json.dump({"tables": tables}, f, ensure_ascii=False, indent=2)
                print(f"\n表列表已保存到 {args.output}")
            
            return 0
        
        if args.table:
            # 分析指定的表
            analysis = analyze_table(args.table, args.sample)
            
            # 显示分析结果
            print(f"\n======= 表 {args.table} 分析 =======")
            display_table_schema(analysis['schema'])
            display_table_stats(analysis['stats'])
            display_column_stats(analysis['column_stats'])
            display_sample_data(analysis['sample_data'])
            
            if args.output:
                with open(args.output, 'w', encoding='utf-8') as f:
                    json.dump(analysis, f, ensure_ascii=False, indent=2, default=str)
                print(f"\n分析结果已保存到 {args.output}")
            
            return 0
        
        # 如果没有指定参数，分析所有表
        tables = list_tables()
        display_table_list(tables)
        
        print("\n使用 --table 参数指定要分析的表")
        return 0
        
    except Exception as e:
        logger.error(f"执行过程中出错: {str(e)}", exc_info=True)
        return 1

if __name__ == "__main__":
    import sys
    sys.exit(main())
