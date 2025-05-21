#!/usr/bin/env bash
cd tasks
set -e

# 使用日期时间作为镜像标签，格式为YYYYMMDD-HHMMSS
TAG=$(date "+%Y%m%d-%H%M%S")
ECR_REPO="113745426946.dkr.ecr.us-east-1.amazonaws.com/xuetaotest/me-task"

# 确保已创建buildx构建器
if ! docker buildx inspect mybuilder &>/dev/null; then
  echo "创建新的buildx构建器"
  docker buildx create --name mybuilder --use
fi

echo "构建并推送多架构镜像，标签: $TAG"
# 构建并推送多架构镜像 (linux/amd64 和 linux/arm64)
docker buildx build --platform linux/amd64,linux/arm64 \
  -t $ECR_REPO:$TAG \
  -t $ECR_REPO:latest \
  --push .

cd ../

# 更新test-job.yaml中的镜像标签
echo "更新test-job.yaml中的镜像标签为: $TAG"
sed -i.bak "s|$ECR_REPO:latest|$ECR_REPO:$TAG|g" test-job.yaml

# 添加架构标记到yaml文件注释中，方便追踪
echo "添加多架构标记到yaml文件"
if ! grep -q "# Multi-arch: amd64,arm64" test-job.yaml; then
  sed -i.bak "s|apiVersion: batch/v1|# Multi-arch: amd64,arm64\napiVersion: batch/v1|" test-job.yaml
fi

kubectl delete job weekly-habit-stats-test -n me
kubectl apply -f test-job.yaml

echo "等待 job 创建 pod..."
sleep 5  # 等待几秒钟让 pod 创建

set +e  # 关闭错误检查，以便继续执行后续命令
# 获取 pod 名称并自动查看日志
POD_NAME=$(kubectl get pods -n me -l job-name=weekly-habit-stats-test -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ -n "$POD_NAME" ]; then
  echo "发现 pod: $POD_NAME，正在获取日志..."
  kubectl logs -f -n me $POD_NAME
else
  echo "未找到 pod，等待 pod 创建..."
  # 轮询等待 pod 创建，最多等待 60 秒
  for i in {1..12}; do
    POD_NAME=$(kubectl get pods -n me -l job-name=weekly-habit-stats-test -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    if [ -n "$POD_NAME" ]; then
      echo "发现 pod: $POD_NAME，正在获取日志..."
      kubectl logs -f -n me $POD_NAME
      break
    fi
    echo "等待 pod 创建... ($i/12)"
    sleep 5
  done
  
  if [ -z "$POD_NAME" ]; then
    echo "超时：未能找到 pod，请手动检查状态：kubectl get pods -n me"
  fi
fi

# 恢复test-job.yaml回到latest标签，以便下次运行
echo "恢复test-job.yaml回到latest标签"
sed -i.bak "s|$ECR_REPO:$TAG|$ECR_REPO:latest|g" test-job.yaml
rm -f test-job.yaml.bak 


