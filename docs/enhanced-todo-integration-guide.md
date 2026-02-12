# 增强的TODO标签系统 - 集成指南

## 概述

本项目已经集成了基于三层标签分类的增强TODO管理系统。该系统强制每个TODO选择三个必填标签分类（决策类、领域类、工作性质），帮助你更智能地优先级排序和精力分配。

## 技术实现

### 1. 数据库修改

**文件**: `drizzle/0033_add_tag_category.sql`

添加了`tag_category`枚举类型和对应的字段：

```sql
CREATE TYPE "tag_category" AS ENUM ('decision_type', 'domain_type', 'work_nature');
ALTER TABLE "tags" ADD COLUMN "category" "tag_category";
```

### 2. Schema 更新

**文件**: `lib/db/schema.ts`

```typescript
export const tagCategory = pgEnum("tag_category", [
  'decision_type',  // 决策类
  'domain_type',    // 领域类
  'work_nature',    // 工作性质
]);

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 50 }),
  kind:  varchar("kind", { length: 50 }),
  category: tagCategory("category"), // 新增字段
  user_id: varchar("user_id", { length: 255 }).notNull(),
}, (table) => {
  return {
    nameUserIdIdx: uniqueIndex("nameUserIdIdx").on(table.name, table.user_id),
    categoryIdx: index("categoryIdx").using("btree", table.category),
  };
});
```

### 3. 工具函数

**文件**: 
- `lib/tag-utils.ts` - 基础工具函数
- `lib/tag-categories.ts` - 标签分类定义
- `lib/types/enhanced-tag-system.ts` - TypeScript类型定义

### 4. UI 组件

**新增组件**:

#### `components/required-tags-selection.tsx`
强制选择三个必填标签分类的对话框组件

```typescript
export function RequiredTagsSelection({
  open,
  onOpenChange,
  allTags,
  selectedTagIds,
  onConfirm,
}: RequiredTagsSelectionProps)
```

**特点**:
- 显示三个分类
- 每个分类仅允许选择一个标签
- 验证所有分类都已选择
- 取消/确认操作

#### `app/(dashboard)/todolist/components/todo-tag-manager.tsx` 改进
- 添加标签分类选择下拉框
- 按分类过滤显示标签
- 标签旁显示分类标签（决/域/性）

#### `components/QuickTodoModal.tsx` 改进
- 集成必填标签选择器
- 提交前验证必填标签
- 支持AI拆解模式下的必填标签

#### `components/daily-start/todo-item.tsx` 改进
- 在编辑标签对话框中添加必填标签选择
- 提交前验证必填标签

### 5. 类型支持

**文件**: `lib/tag-utils.ts`

```typescript
export interface Tag {
  id: number;
  name: string;
  color: string;
  kind: string;
  category?: 'decision_type' | 'domain_type' | 'work_nature';
}
```

## 使用流程

### 1. 环境准备

```bash
# 如果是首次使用或需要初始化
chmod +x scripts/init-tag-system.sh
./scripts/init-tag-system.sh
```

### 2. 创建TODO时

```typescript
// 用户必须选择三个必填标签
const requiredTags = {
  decision_type: 1,    // 选择一个决策类标签，如"高收益"
  domain_type: 2,      // 选择一个领域类标签，如"Kubernetes"
  work_nature: 3,      // 选择一个工作性质标签，如"推进中项目"
};

// 提交时会自动验证
```

### 3. 编辑TODO标签时

点击标签编辑 → 选择必填标签 → 可以添加其他标签 → 提交

### 4. 查询和过滤

按分类查询标签：

```typescript
// 获取某个分类的所有标签
const decisionTags = await db.query.tags
  .findMany({
    where: (tags, { eq, and }) =>
      and(
        eq(tags.user_id, userId),
        eq(tags.kind, 'todo'),
        eq(tags.category, 'decision_type')
      ),
  });
```

## API 变更

### Tag API

创建/更新标签时包含category字段：

```json
{
  "method": "POST",
  "url": "/api/tag",
  "body": {
    "name": "高风险",
    "color": "#EF4444",
    "kind": "todo",
    "category": "decision_type"
  }
}
```

```json
{
  "method": "PATCH",
  "url": "/api/tag",
  "body": {
    "id": [1],
    "fields": {
      "name": "高风险",
      "color": "#EF4444",
      "category": "decision_type"
    }
  }
}
```

### Todo API

创建/更新TODO时，确保包含必填标签的tagIds：

```json
{
  "title": "优化API性能",
  "tagIds": [1, 2, 3],  // 必须包含来自三个不同分类的标签
  ...
}
```

## 验证逻辑

### 前端验证

```typescript
// components/required-tags-selection.tsx
const isComplete = Object.values(selected).every(id => id !== 0);

// 确保每个分类都有选择
```

### 后端验证（可选）

```typescript
// lib/types/enhanced-tag-system.ts
const { valid, missing } = validateTodoTags(todoTagIds, allTags);
if (!valid) {
  throw new Error(`缺少必填标签分类: ${missing.join(', ')}`);
}
```

## 标签分类预定义值

### 决策类（decision_type）
- 🔥 高风险 - #EF4444
- 🎯 高收益 - #10B981
- ⛔ 阻塞中 - #F97316
- 🧨 技术债 - #8B5CF6
- 🧪 实验性 - #3B82F6

### 领域类（domain_type）
- ☸️ Kubernetes - #0EA5E9
- 🤖 Agent / LLM - #6366F1
- 🛡 稳定性 - #EC4899
- 🔐 安全 - #DC2626
- 📊 数据 / 观测 - #F59E0B
- 🧩 架构设计 - #14B8A6

### 工作性质（work_nature）
- 🧱 基建 - #64748B
- 🚀 推进中项目 - #06B6D4
- 📝 文档 / 输出 - #84CC16
- 🔍 调研 - #A855F7
- 🧯 故障 / Oncall - #FB923C

## 迁移指南

### 现有系统升级

1. **执行数据库迁移**
   ```bash
   pnpm drizzle-kit migrate
   ```

2. **更新标签数据**
   - 手动或通过API为现有标签添加分类
   - 或重新创建新的分类标签

3. **验证现有TODO**
   - 现有TODO无需立即修改
   - 编辑时将被提示添加必填标签

### 完全重启（可选）

如果想从干净状态开始：

```sql
-- 删除旧标签数据
DELETE FROM todo_tag_relations;
DELETE FROM tags WHERE kind = 'todo';

-- 然后通过UI重新创建
```

## 故障排除

### 迁移失败

**错误**: `type "tag_category" already exists`

**解决**: 检查是否已运行过迁移，或手动检查数据库

```sql
SELECT EXISTS (SELECT 1 FROM information_schema.enums WHERE enum_name = 'tag_category');
```

### 标签不显示分类

**原因**: 旧标签未设置category字段

**解决**: 编辑标签，添加分类信息

### 无法提交TODO

**原因**: 未选择所有必填标签分类

**解决**: 按照提示在"选择标签"对话框中完整选择

## 文件结构

```
.
├── drizzle/
│   └── 0033_add_tag_category.sql        # 数据库迁移
├── lib/
│   ├── tag-categories.ts                 # 标签分类定义
│   ├── tag-utils.ts                      # 工具函数（已更新）
│   └── types/
│       └── enhanced-tag-system.ts        # TypeScript类型定义
├── components/
│   ├── required-tags-selection.tsx       # 新增：必填标签选择器
│   ├── QuickTodoModal.tsx                # 已更新：支持必填标签
│   └── daily-start/
│       └── todo-item.tsx                 # 已更新：支持必填标签
├── app/
│   └── (dashboard)/
│       └── todolist/
│           └── components/
│               └── todo-tag-manager.tsx  # 已更新：支持分类显示
├── docs/
│   └── enhanced-todo-system.md           # 使用文档
└── scripts/
    └── init-tag-system.sh                # 初始化脚本
```

## 性能考虑

1. **数据库索引**: 已在category字段上添加索引
2. **缓存**: 建议在应用层缓存标签列表
3. **Query优化**: 使用category过滤可以显著减少返回的数据

```typescript
// 优化的查询
const decisionTags = db.query.tags
  .findMany({
    where: tags => eq(tags.category, 'decision_type'),
  });
```

## 未来扩展

1. **标签统计**: 显示每个标签在TODO中的使用频率
2. **智能建议**: 基于历史数据建议合适的标签
3. **标签模板**: 为不同项目预设标签模板
4. **标签分析**: 生成工作类型分布报表

