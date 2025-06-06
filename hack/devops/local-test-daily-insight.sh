#!/usr/bin/env bash
cd /Users/bytedance/OpenSource/me
set -e

# 使用日期时间作为镜像标签，格式为YYYYMMDD-HHMMSS
TAG=$(date "+%Y%m%d-%H%M%S")
ECR_REPO="113745426946.dkr.ecr.us-east-1.amazonaws.com/xuetaotest/me-task"

# 创建一个临时的测试作业YAML文件
cat << EOF > daily-insight-test-job.yaml
# Multi-arch: amd64,arm64
apiVersion: batch/v1
kind: Job
metadata:
  name: daily-insight-test
  namespace: me
spec:
  backoffLimit: 6
  completionMode: NonIndexed
  completions: 1
  manualSelector: false
  parallelism: 1
  podReplacementPolicy: TerminatingOrFailed
  suspend: false
  template:
    spec:
      containers:
      - args:
        - daily_insight.py
        - --chain
        envFrom:
        - secretRef:
            name: app-secret
        image: ${ECR_REPO}:latest
        imagePullPolicy: Always
        name: daily-insight
        resources:
          limits:
            cpu: "1"
            memory: 1Gi
          requests:
            cpu: 200m
            memory: 256Mi
        terminationMessagePath: /dev/termination-log
        terminationMessagePolicy: File
      dnsPolicy: ClusterFirst
      restartPolicy: OnFailure
      schedulerName: default-scheduler
      securityContext: {}
      terminationGracePeriodSeconds: 30
EOF

# 确保已创建buildx构建器
if ! docker buildx inspect mybuilder &>/dev/null; then
  echo "创建新的buildx构建器"
  docker buildx create --name mybuilder --use
fi

echo "构建并推送多架构镜像，标签: $TAG"
# 构建并推送多架构镜像 (linux/amd64 和 linux/arm64)
cd tasks
docker buildx build --platform linux/amd64,linux/arm64 \
  -t $ECR_REPO:$TAG \
  -t $ECR_REPO:latest \
  --push .
cd ..

# 更新测试作业YAML中的镜像标签
echo "更新daily-insight-test-job.yaml中的镜像标签为: $TAG"
sed -i.bak "s|$ECR_REPO:latest|$ECR_REPO:$TAG|g" daily-insight-test-job.yaml

# 删除现有测试作业（如果存在）
kubectl delete job daily-insight-test -n me --ignore-not-found

# 应用新的测试作业
kubectl apply -f daily-insight-test-job.yaml

echo "等待 job 创建 pod..."
sleep 5  # 等待几秒钟让 pod 创建

set +e  # 关闭错误检查，以便继续执行后续命令
# 获取 pod 名称并自动查看日志
POD_NAME=$(kubectl get pods -n me -l job-name=daily-insight-test -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
if [ -n "$POD_NAME" ]; then
  echo "发现 pod: $POD_NAME，正在获取日志..."
  kubectl logs -f -n me $POD_NAME
else
  echo "未找到 pod，等待 pod 创建..."
  # 轮询等待 pod 创建，最多等待 60 秒
  for i in {1..12}; do
    POD_NAME=$(kubectl get pods -n me -l job-name=daily-insight-test -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
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

# 清理临时文件
rm -f daily-insight-test-job.yaml daily-insight-test-job.yaml.bak
