# AI代码生成准则（v1.1）
## 项目架构
项目采用 Next.js + Typescript 框架，架构分为以下几个核心部分：
1. 核心层 (core)
```
  /lib/
  ├─ db/              # 数据库操作核心，使用drizzle ORM
  ├─ langchain/       # AI 模型集成
  ├─ utils/           # 工具函数
  └─ auth/            # 认证服务
```
2. 功能模块层
```
/app/
  ├─ (dashboard)/     # 用户仪表盘
  │   ├─ dashboard/   # 总览
  │   ├─ habits/      # 习惯管理
  │   ├─ goals/       # 目标管理
  │   ├─ todolist/    # 待办事项
  │   └─ pomodoro/    # 番茄钟
  ├─ api/             # API路由
  │   ├─ todolist/    # 待办API
  │   ├─ habits/      # 习惯API
  │   ├─ ai/          # AI功能API
  │   └─ pomodoro/    # 番茄钟API
  └─ [...]/           # 其他页面
```
3. 组件层
```
/components/
  ├─ ui/              # 基础UI组件
  ├─ hooks/           # 自定义钩子
  └─ notes/           # 笔记组件，高频重要组件放这里
```
1. 其他
drizzle的schema文件位于./iac/drizzle/schema

## 🔄 数据流转架构
```
UI组件 
  ↕️
页面组件(Server/Client Components)
  ↕️
服务端API(Route Handlers)
  ↕️
数据库操作层(lib/db) <=> AI集成层(lib/langchain)

```

## 🚀 提交功能最佳实践
> AI First原则：优先考虑是否需要AI功能
1. 功能开发流程
确定需求范围：先明确功能定位在哪个模块，同时需要确定此功能能否需要AI介入或者AI可以提供更高的监督
架构设计：按照KISS原则设计简单直接的方案，重复代码必须封装
先搭建框架：按照项目结构规范创建文件
编写核心逻辑：实现基本功能
添加UI交互：对接前端组件
编写测试：遵循测试要求章节

## 提交功能修复最佳实践
1. 功能修复流程
2. 确定需求范围：明确修复的具体问题和影响范围
3. 架构设计：根据修复需求调整架构，确保不影响其他功能
4. 编写修复逻辑：实现修复方案
5. 添加测试：确保修复后的功能正常

## 🔍 特殊注意事项
1. AI集成：使用lib/langchain/chains.ts添加新的AI链
2. 缓存机制：AI请求必须使用createCachedChain确保性能，节省成本
3. 状态管理：前端组件使用React状态钩子，避免全局状态库
4. 异常处理：按照规范捕获并处理错误