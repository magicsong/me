#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
导出分析结果到对象存储（如AWS S3、阿里云OSS等）
"""
import os
import logging
import argparse
from datetime import datetime
import boto3
from botocore.exceptions import ClientError
import glob
from pathlib import Path

from config import config

# 配置日志
logging.basicConfig(
    level=getattr(logging, config.log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class StorageExporter:
    """存储导出器基类"""
    
    def __init__(self, storage_type="s3"):
        self.storage_type = storage_type
    
    def export_file(self, local_path, remote_path):
        """导出单个文件，子类需要实现"""
        raise NotImplementedError("子类必须实现此方法")
    
    def export_directory(self, local_dir, remote_prefix):
        """导出整个目录"""
        if not os.path.exists(local_dir):
            logger.error(f"本地目录不存在: {local_dir}")
            return False
        
        success_count = 0
        error_count = 0
        
        for filepath in glob.glob(f"{local_dir}/**/*", recursive=True):
            if os.path.isfile(filepath):
                rel_path = os.path.relpath(filepath, local_dir)
                remote_path = f"{remote_prefix}/{rel_path}"
                
                try:
                    if self.export_file(filepath, remote_path):
                        success_count += 1
                    else:
                        error_count += 1
                except Exception as e:
                    logger.error(f"导出文件出错 {filepath}: {str(e)}")
                    error_count += 1
        
        logger.info(f"导出完成. 成功: {success_count}, 失败: {error_count}")
        return error_count == 0

class S3Exporter(StorageExporter):
    """AWS S3导出器"""
    
    def __init__(self, bucket_name, aws_access_key=None, aws_secret_key=None, region=None, endpoint_url=None):
        super().__init__("s3")
        self.bucket_name = bucket_name
        
        # 使用环境变量或参数提供的密钥
        kwargs = {}
        if aws_access_key and aws_secret_key:
            kwargs["aws_access_key_id"] = aws_access_key
            kwargs["aws_secret_access_key"] = aws_secret_key
        
        if region:
            kwargs["region_name"] = region
            
        if endpoint_url:
            kwargs["endpoint_url"] = endpoint_url
            
        self.s3_client = boto3.client('s3', **kwargs)
        
    def export_file(self, local_path, remote_path):
        """导出文件到S3"""
        try:
            logger.info(f"正在上传 {local_path} 到 s3://{self.bucket_name}/{remote_path}")
            self.s3_client.upload_file(
                local_path, 
                self.bucket_name, 
                remote_path
            )
            logger.info(f"成功上传 {local_path}")
            return True
        except ClientError as e:
            logger.error(f"上传到S3出错: {str(e)}")
            return False

def get_exporter(storage_type, args):
    """获取合适的导出器实例"""
    if storage_type.lower() == "s3":
        return S3Exporter(
            bucket_name=args.bucket,
            aws_access_key=args.aws_key,
            aws_secret_key=args.aws_secret,
            region=args.region,
            endpoint_url=args.endpoint
        )
    else:
        logger.error(f"不支持的存储类型: {storage_type}")
        return None

def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='导出分析结果到对象存储')
    parser.add_argument('--storage', choices=['s3'], default='s3',
                      help='存储类型: s3 (AWS S3/兼容S3的存储)')
    parser.add_argument('--source', default='output',
                      help='要导出的本地目录路径')
    parser.add_argument('--bucket', required=True,
                      help='S3 存储桶名称')
    parser.add_argument('--prefix', default='analytics',
                      help='远程路径前缀')
    parser.add_argument('--date-prefix', action='store_true',
                      help='添加日期前缀 (YYYY/MM/DD)')
    parser.add_argument('--aws-key',
                      help='AWS 访问密钥ID (也可通过环境变量 AWS_ACCESS_KEY_ID 设置)')
    parser.add_argument('--aws-secret',
                      help='AWS 秘密访问密钥 (也可通过环境变量 AWS_SECRET_ACCESS_KEY 设置)')
    parser.add_argument('--region',
                      help='AWS 区域 (也可通过环境变量 AWS_REGION 设置)')
    parser.add_argument('--endpoint',
                      help='S3 兼容服务的终端节点URL (用于非AWS S3服务)')
    
    args = parser.parse_args()
    
    # 获取合适的导出器
    exporter = get_exporter(args.storage, args)
    if not exporter:
        return 1
    
    # 构建远程路径前缀
    remote_prefix = args.prefix
    if args.date_prefix:
        today = datetime.now()
        date_prefix = f"{today.year}/{today.month:02d}/{today.day:02d}"
        remote_prefix = f"{remote_prefix}/{date_prefix}"
    
    # 执行导出
    if exporter.export_directory(args.source, remote_prefix):
        logger.info("导出成功完成")
        return 0
    else:
        logger.error("导出过程中发生错误")
        return 1

if __name__ == "__main__":
    import sys
    sys.exit(main())
