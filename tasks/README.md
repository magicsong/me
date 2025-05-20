# 数据分析任务

这个项目提供了一系列基于Python的数据分析任务，能够直接从PostgreSQL数据库读取数据并生成报告。这些任务可以通过Kubernetes CronJob在容器中定期执行。

## 功能

- **数据摘要**：分析习惯、待办和笔记数据
  - 每日摘要：分析前一天的数据
  - 周报摘要：分析过去7天的数据趋势和模式
  - 月度摘要：分析过去30天的数据趋势和模式
- **数据可视化**：生成各种图表
  - 习惯完成率趋势图
  - 习惯每周完成热力图
  - 待办事项优先级分布饼图
  - 待办事项创建和完成趋势图
  - 生产力日历热力图
- **数据库探索**：分析数据库表结构和内容
  - 列出所有表
  - 分析表结构和数据分布
  - 提取样本数据
- **导出功能**：将分析结果导出到对象存储（如S3）

## 项目结构

```
tasks/
├── config.py             # 配置管理
├── create_env.py         # 创建环境变量文件工具
├── cronjob.yaml          # Kubernetes CronJob配置
├── daily_summary.py      # 每日摘要生成脚本
├── db.py                 # 数据库访问层
├── Dockerfile            # 容器构建文件
├── explore_db.py         # 数据库探索工具
├── export_to_storage.py  # 导出到对象存储工具
├── generate_charts.py    # 图表生成工具
├── main.py               # 主入口文件
├── README.md             # 项目说明文档
├── requirements.txt      # Python依赖清单
├── utils.py              # 工具函数
└── weekly_summary.py     # 周报摘要生成脚本
```

## 环境变量

项目通过环境变量进行配置，支持以下变量：

- `POSTGRES_URL`: 完整的PostgreSQL连接字符串（优先）
- `POSTGRES_HOST`: PostgreSQL主机地址
- `POSTGRES_PORT`: PostgreSQL端口
- `POSTGRES_USER`: PostgreSQL用户名
- `POSTGRES_PASSWORD`: PostgreSQL密码
- `POSTGRES_DATABASE`: PostgreSQL数据库名
- `DEBUG`: 调试模式开关 (true/false)
- `LOG_LEVEL`: 日志级别 (INFO, DEBUG, WARNING, ERROR)
- `TZ`: 时区设置，默认为 "Asia/Shanghai"

## 安装和使用

### 本地开发

1. 创建虚拟环境并安装依赖：

```bash
cd tasks
python -m venv venv
source venv/bin/activate  # 在 Windows 上使用 venv\Scripts\activate
pip install -r requirements.txt
```

2. 设置环境变量（可以使用提供的工具创建 .env 文件）：

```bash
python create_env.py --url "postgresql://username:password@localhost:5432/me"
# 或者单独设置参数
python create_env.py --host localhost --port 5432 --user postgres --password yourpassword --database me
```

3. 运行任务：

```bash
# 生成数据摘要
python main.py summary daily     # 生成每日摘要
python main.py summary weekly    # 生成周报摘要
python main.py summary monthly   # 生成月度摘要

# 生成数据图表
python main.py charts --days 30  # 生成最近30天的图表
python main.py charts --start-date 2025-01-01 --end-date 2025-01-31  # 生成指定日期范围的图表

# 数据库探索
python main.py explore-db --list  # 列出所有表
python main.py explore-db --table habits  # 分析特定表

# 导出到对象存储
python main.py export --bucket my-bucket --prefix analytics  # 导出到S3
```

### 容器构建

1. 构建Docker镜像：

```bash
docker build -t me-tasks:latest .
```

2. 运行容器：

```bash
# 生成摘要
docker run --env-file .env me-tasks:latest summary daily

# 生成图表
docker run --env-file .env me-tasks:latest charts --days 30

# 数据库探索
docker run --env-file .env me-tasks:latest explore-db --table habits
```

### Kubernetes部署

1. 确保创建含有数据库连接信息的Secret：

```bash
kubectl create secret generic me-app-secrets \
  --from-literal=POSTGRES_URL="postgresql://username:password@db-host:5432/me"
```

2. 应用CronJob配置：

```bash
kubectl apply -f cronjob.yaml
```

## 输出

所有任务都将在容器内的 `/app/output` 目录中生成输出文件，包括：

- CSV数据文件
- JSON摘要文件
- 数据可视化图表 (PNG格式)

## 导出到对象存储

你可以将生成的报告和图表导出到S3或兼容S3的对象存储中：

```bash
# 导出到AWS S3
python main.py export --bucket my-bucket --prefix analytics --date-prefix

# 导出到非AWS的S3兼容存储（如MinIO）
python main.py export --bucket my-bucket --endpoint http://minio-server:9000 --aws-key mykey --aws-secret mysecret
```

## 扩展

要添加新的任务类型，可以：

1. 创建新的任务脚本
2. 在`main.py`中注册新任务
3. 在`cronjob.yaml`中添加相应的CronJob配置
