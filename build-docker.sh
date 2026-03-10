#!/bin/bash

# Docker本地编译和运行脚本
# 功能：构建镜像并运行容器，将.env.local中的参数直接注入

set -e  # 任何命令失败都退出

# 配置
PROJECT_NAME="me-app"
DOCKER_IMAGE="${PROJECT_NAME}:latest"
CONTAINER_NAME="${PROJECT_NAME}-container"
PORT=3000

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印帮助信息
usage() {
    cat << EOF
用法: ./build-docker.sh [命令] [选项]

命令:
  build              仅构建镜像
  run                构建并运行容器
  rebuild            强制重新构建镜像（不使用缓存）
  stop               停止运行中的容器
  clean              删除已停止的容器和镜像
  logs               查看容器日志

选项:
  -p, --port PORT    指定映射的端口（默认：3000）
  -h, --help         显示帮助信息

示例:
  ./build-docker.sh build
  ./build-docker.sh run -p 8080
  ./build-docker.sh rebuild
  ./build-docker.sh stop
EOF
}

# 构建镜像
build_image() {
    echo -e "${YELLOW}🔨 开始构建Docker镜像...${NC}"
    
    if [ "$NO_CACHE" = "true" ]; then
        docker build --no-cache -t ${DOCKER_IMAGE} .
    else
        docker build -t ${DOCKER_IMAGE} .
    fi
    
    echo -e "${GREEN}✅ 镜像构建完成: ${DOCKER_IMAGE}${NC}"
}

# 停止已运行的容器
stop_container() {
    if docker ps | grep -q ${CONTAINER_NAME}; then
        echo -e "${YELLOW}🛑 停止容器...${NC}"
        docker stop ${CONTAINER_NAME}
    fi
    
    if docker ps -a | grep -q ${CONTAINER_NAME}; then
        echo -e "${YELLOW}🗑️  删除已停止的容器...${NC}"
        docker rm ${CONTAINER_NAME}
    fi
}

# 运行容器
run_container() {
    stop_container
    
    echo -e "${YELLOW}🚀 启动容器...${NC}"
    
    # 读取 .env.local 文件并进行必要的替换
    # 将本地 127.0.0.1 替换为 host.docker.internal（用于访问宿主机服务）
    local postgres_url=$(grep "^POSTGRES_URL=" .env.local | cut -d'=' -f2 | sed 's/127.0.0.1/host.docker.internal/g')
    local auth_drizzle_url=$(grep "^AUTH_DRIZZLE_URL=" .env.local | cut -d'=' -f2 | sed 's/127.0.0.1/host.docker.internal/g')
    
    # 使用 --env-file 直接加载所有环境变量，并添加本地开发需要的额外配置
    docker run -d \
        --name ${CONTAINER_NAME} \
        --env-file .env.local \
        -e NEXTAUTH_URL="http://127.0.0.1:${PORT}" \
        -e NEXTAUTH_TRUST_HOST="true" \
        -e POSTGRES_URL="${postgres_url}" \
        -e AUTH_DRIZZLE_URL="${auth_drizzle_url}" \
        -p ${PORT}:3000 \
        --restart=unless-stopped \
        ${DOCKER_IMAGE}
    
    echo -e "${GREEN}✅ 容器启动成功${NC}"
    echo -e "${GREEN}📍 应用地址: http://127.0.0.1:${PORT}${NC}"
    echo -e "${GREEN}📍 也可访问: http://localhost:${PORT}${NC}"
    echo -e "${GREEN}🔗 数据库连接: host.docker.internal:5432${NC}"
    sleep 2
    echo -e "${YELLOW}📋 容器日志:${NC}"
    docker logs ${CONTAINER_NAME}
}

# 查看日志
show_logs() {
    if docker ps | grep -q ${CONTAINER_NAME}; then
        docker logs -f ${CONTAINER_NAME}
    else
        echo -e "${RED}❌ 容器未运行${NC}"
        exit 1
    fi
}

# 清理
cleanup() {
    echo -e "${YELLOW}🧹 清理Docker资源...${NC}"
    
    stop_container
    
    if docker images | grep -q ${PROJECT_NAME}; then
        echo -e "${YELLOW}删除镜像...${NC}"
        docker rmi ${DOCKER_IMAGE}
    fi
    
    echo -e "${GREEN}✅ 清理完成${NC}"
}

# 主逻辑
main() {
    # 检查Docker
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker未安装${NC}"
        exit 1
    fi
    
    # 检查.env.local
    if [ ! -f ".env.local" ]; then
        echo -e "${RED}❌ .env.local文件不存在${NC}"
        exit 1
    fi
    
    # 解析命令
    case "${1:-run}" in
        build)
            build_image
            ;;
        run)
            # 解析可选参数
            PORT=3000
            while [[ $# -gt 1 ]]; do
                case "$2" in
                    -p|--port)
                        PORT="$3"
                        shift 2
                        ;;
                    *)
                        shift
                        ;;
                esac
            done
            build_image
            run_container
            ;;
        rebuild)
            NO_CACHE=true
            build_image
            ;;
        stop)
            stop_container
            echo -e "${GREEN}✅ 容器已停止${NC}"
            ;;
        clean)
            cleanup
            ;;
        logs)
            show_logs
            ;;
        -h|--help|help)
            usage
            ;;
        *)
            echo -e "${RED}❌ 未知命令: $1${NC}"
            usage
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"
