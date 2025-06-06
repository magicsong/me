#!/usr/bin/env bash
# 本地测试daily_insight.py脚本，无需构建和推送Docker镜像
cd /Users/bytedance/OpenSource/me

# 获取昨天的日期
YESTERDAY=$(date -v-1d "+%Y-%m-%d")

echo "开始本地测试daily_insight.py，使用日期: $YESTERDAY"
echo "执行命令: python tasks/daily_insight.py --date \"$YESTERDAY\" --chain --force"
echo "-------------------------------------"

# 执行daily_insight.py脚本
python tasks/daily_insight.py --date "$YESTERDAY" --chain --force

echo "-------------------------------------"
echo "测试完成"
