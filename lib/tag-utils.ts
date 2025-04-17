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
}

// 可用的标签类型定义
export const TAG_KINDS = [
  { value: "todo", label: "待办事项" },
  { value: "tomato", label: "番茄钟" },
  { value: "note", label: "笔记" },
  { value: "habit", label: "习惯" },
];

// 根据类型获取标签
export const filterTagsByKind = (tags: Tag[], kind: string) => {
  return tags.filter(tag => tag.kind === kind);
};

// 获取标签数据结构
export const getTagById = (tags: Tag[], id: number) => {
  return tags.find(tag => tag.id === id);
};

// 根据IDs获取多个标签
export const getTagsByIds = (tags: Tag[], ids: number[] = []) => {
  return tags.filter(tag => ids.includes(tag.id));
};
