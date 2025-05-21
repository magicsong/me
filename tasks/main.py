#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
主入口文件 - 可以根据命令行参数执行不同的任务
"""
import argparse
import logging
import sys
from config import config

# 配置日志
logging.basicConfig(
    level=getattr(logging, config.log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='数据分析任务执行器')
    subparsers = parser.add_subparsers(dest='command', help='子命令')
    
    # 摘要子命令
    summary_parser = subparsers.add_parser('summary', help='生成数据摘要')
    summary_parser.add_argument('type', choices=['daily', 'weekly', 'monthly'], 
                      help='摘要类型: daily (每日摘要), weekly (周报摘要), monthly (月度摘要)')
    summary_parser.add_argument('--days', type=int, default=7,
                      help='天数范围 (仅对weekly和monthly有效)')
    
    # 图表子命令
    charts_parser = subparsers.add_parser('charts', help='生成数据图表')
    charts_parser.add_argument('--days', type=int, default=30,
                    help='数据天数范围')
    charts_parser.add_argument('--output', default='output',
                    help='输出目录')
    charts_parser.add_argument('--start-date',
                    help='开始日期 (YYYY-MM-DD)')
    charts_parser.add_argument('--end-date',
                    help='结束日期 (YYYY-MM-DD)')
    
    # 习惯统计子命令
    habits_parser = subparsers.add_parser('habits', help='习惯打卡统计')
    habits_parser.add_argument('--user-id', dest='user_id', help='用户ID，不指定则处理所有用户')
    habits_parser.add_argument('--update', action='store_true',
                    help='只更新统计数据，不生成报告')
    habits_parser.add_argument('--days', type=int, default=30,
                    help='分析的天数 (默认: 30)')
    habits_parser.add_argument('--format', choices=['json', 'csv', 'all'], default='all', 
                    help='输出格式 (默认: all)')
    
    # 数据库探索子命令
    db_parser = subparsers.add_parser('explore-db', help='数据库探索工具')
    db_parser.add_argument('--table',
                  help='要分析的表名')
    db_parser.add_argument('--list', action='store_true',
                  help='列出所有表')
    db_parser.add_argument('--sample', type=int, default=5,
                  help='样本数据行数')
    db_parser.add_argument('--output',
                  help='将结果保存到JSON文件')
    
    # 导出到存储子命令
    export_parser = subparsers.add_parser('export', help='导出分析结果到对象存储')
    export_parser.add_argument('--storage', choices=['s3'], default='s3',
                    help='存储类型: s3 (AWS S3/兼容S3的存储)')
    export_parser.add_argument('--source', default='output',
                    help='要导出的本地目录路径')
    export_parser.add_argument('--bucket', required=True,
                    help='S3 存储桶名称')
    export_parser.add_argument('--prefix', default='analytics',
                    help='远程路径前缀')
    export_parser.add_argument('--date-prefix', action='store_true',
                    help='添加日期前缀 (YYYY/MM/DD)')
    export_parser.add_argument('--aws-key',
                    help='AWS 访问密钥ID')
    export_parser.add_argument('--aws-secret',
                    help='AWS 秘密访问密钥')
    export_parser.add_argument('--region',
                    help='AWS 区域')
    export_parser.add_argument('--endpoint',
                    help='S3 兼容服务的终端节点URL')
    
    args = parser.parse_args()
    
    try:
        # 处理没有子命令的情况
        if not args.command:
            parser.print_help()
            return 0
            
        # 根据子命令执行相应的功能
        if args.command == 'summary':
            if args.type == 'daily':
                from daily_summary import generate_daily_summary
                summary = generate_daily_summary()
                logger.info(f"生产力得分: {summary['overall']['productivity_score']:.2f}/100")
            
            elif args.type == 'weekly':
                from weekly_summary import generate_weekly_summary
                summary = generate_weekly_summary(days=args.days)
                logger.info(f"周度生产力得分: {summary['overall']['productivity_score']:.2f}/100")
            
            elif args.type == 'monthly':
                # 这里可以添加月度摘要逻辑，现在仅用周报模块实现
                from weekly_summary import generate_weekly_summary
                summary = generate_weekly_summary(days=30)
                logger.info(f"月度生产力得分: {summary['overall']['productivity_score']:.2f}/100")
        
        elif args.command == 'charts':
            from generate_charts import generate_charts
            
            start_date = None
            end_date = None
            
            if args.start_date and args.end_date:
                from datetime import datetime
                start_date = datetime.strptime(args.start_date, '%Y-%m-%d').date()
                end_date = datetime.strptime(args.end_date, '%Y-%m-%d').date()
                days = (end_date - start_date).days + 1
            else:
                days = args.days
            
            generate_charts(days, args.output)
        
        elif args.command == 'explore-db':
            from explore_db import main as explore_main
            sys.argv = [sys.argv[0]] + sys.argv[2:]  # 移除'explore-db'命令
            return explore_main()
        
        elif args.command == 'export':
            from export_to_storage import main as export_main
            sys.argv = [sys.argv[0]] + sys.argv[2:]  # 移除'export'命令
            return export_main()
        
        elif args.command == 'habits':
            if args.update:
                from habit_stats import HabitStatsService
                with HabitStatsService() as service:
                    updated = service.update_all_user_stats(args.user_id)
                    if args.user_id:
                        logger.info(f"已更新用户 {args.user_id} 的 {updated} 个习惯统计数据")
                    else:
                        logger.info(f"已更新所有用户的 {updated} 个习惯统计数据")
            else:
                # 生成报告必须指定用户
                if not args.user_id:
                    logger.error("生成报告时必须指定 --user-id 参数")
                    return 1
                    
                from habit_report import main as habit_report_main
                sys.argv = ["habit_report.py", args.user_id, "--days", str(args.days), "--format", args.format]
                habit_report_main()
                logger.info(f"用户 {args.user_id} 的习惯统计报告生成完成")
        
        logger.info(f"成功完成 {args.command} 任务")
        return 0
    
    except Exception as e:
        logger.error(f"执行任务出错: {str(e)}", exc_info=True)
        return 1

if __name__ == "__main__":
    sys.exit(main())
