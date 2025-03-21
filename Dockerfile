# 第一阶段：依赖安装和构建
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 复制 package.json 和 lock 文件
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制所有源代码
COPY . .

# 禁用类型检查，设置环境变量
ENV NEXT_IGNORE_TYPE_CHECK=1
ENV NEXT_IGNORE_ESLint=1
ENV NEXT_TELEMETRY_DISABLED=1

# 构建应用
RUN pnpm build

# 第二阶段：生产环境
FROM node:20-alpine AS runner

WORKDIR /app

# 设置为生产环境
ENV NODE_ENV=production

# 安装必要的运行时依赖
RUN corepack enable && corepack prepare pnpm@latest --activate

# 从构建阶段复制 Next.js 输出文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# 创建非 root 用户并设置权限
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs \
    && chown -R nextjs:nodejs /app
USER nextjs

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# 启动应用
CMD ["node", "server.js"]
