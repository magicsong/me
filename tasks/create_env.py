#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
创建本地开发环境所需的.env文件
"""
import os
import argparse

def generate_env_file(postgres_url=None, host=None, port=None, user=None, password=None, database=None):
    """生成.env文件"""
    env_content = [
        "# 数据库连接配置",
    ]
    
    if postgres_url:
        env_content.append(f"POSTGRES_URL={postgres_url}")
    else:
        # 使用单独的连接参数
        if host:
            env_content.append(f"POSTGRES_HOST={host}")
        if port:
            env_content.append(f"POSTGRES_PORT={port}")
        if user:
            env_content.append(f"POSTGRES_USER={user}")
        if password:
            env_content.append(f"POSTGRES_PASSWORD={password}")
        if database:
            env_content.append(f"POSTGRES_DATABASE={database}")
    
    # 添加其他默认配置
    env_content.extend([
        "",
        "# 应用配置",
        "DEBUG=true",
        "LOG_LEVEL=INFO",
        "TZ=Asia/Shanghai",
    ])
    
    # 写入.env文件
    with open('.env', 'w') as f:
        f.write('\n'.join(env_content))
    
    print("已创建.env文件")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='生成.env文件')
    parser.add_argument('--url', help='完整的PostgreSQL连接字符串')
    parser.add_argument('--host', help='PostgreSQL主机地址')
    parser.add_argument('--port', help='PostgreSQL端口号')
    parser.add_argument('--user', help='PostgreSQL用户名')
    parser.add_argument('--password', help='PostgreSQL密码')
    parser.add_argument('--database', help='PostgreSQL数据库名')
    
    args = parser.parse_args()
    
    generate_env_file(
        postgres_url=args.url,
        host=args.host,
        port=args.port,
        user=args.user,
        password=args.password,
        database=args.database
    )
