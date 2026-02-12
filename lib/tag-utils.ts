// 生成随机颜色
export const generateRandomColor = () => {
  // 预定义的一组好看的颜色
  const colors = [
    "#F87171", // 红色
    "#FB923C", // 橙色
    "#FBBF24", // 黄色
    "#34D399", // 绿色
    "#60A5FA", // 蓝色
    "#818CF8", // 靛蓝色
    "#A78BFA", // 紫色
    "#F472B6", // 粉色
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// 标签类型
export interface Tag {
  id: number;
  name: string;
  color: string;
  kind: string;
  category?: 'decision_type' | 'domain_type' | 'work_nature';
}

// 可用的标签类型定义
export const TAG_KINDS = [
  { value: "todo", label: "待办事项" },
  { value: "tomato", label: "番茄钟" },
  { value: "note", label: "笔记" },
  { value: "habit", label: "习惯" },
];

// 标签分类定义
export const TAG_CATEGORIES = [
  { value: "decision_type", label: "决策类（最重要）" },
  { value: "domain_type", label: "领域类（按实际工作）" },
  { value: "work_nature", label: "工作性质" },
];

// 根据类型获取标签
export const filterTagsByKind = (tags: Tag[], kind: string) => {
  return tags.filter(tag => tag.kind === kind);
};

// 根据分类获取标签
export const filterTagsByCategory = (tags: Tag[], category: string) => {
  return tags.filter(tag => tag.category === category);
};

// 获取标签数据结构
export const getTagById = (tags: Tag[], id: number) => {
  return tags.find(tag => tag.id === id);
};

// 根据IDs获取多个标签
export const getTagsByIds = (tags: Tag[], ids: number[] = []) => {
  return tags.filter(tag => ids.includes(tag.id));
};

// 按分类分组标签
export const groupTagsByCategory = (tags: Tag[]) => {
  return tags.reduce((acc, tag) => {
    const category = tag.category || 'uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(tag);
    return acc;
  }, {} as Record<string, Tag[]>);
};
