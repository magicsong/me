/**
 * 标签分类定义和初始化数据
 * 包含三种标签类别：决策类、领域类、工作性质
 */

export type TagCategory = 'decision_type' | 'domain_type' | 'work_nature';

// 决策类标签 - 帮你判断"先做什么"
export const DECISION_TYPE_TAGS = [
  { emoji: '🔥', name: '高风险', color: '#EF4444' },
  { emoji: '🎯', name: '高收益', color: '#10B981' },
  { emoji: '⛔', name: '阻塞中', color: '#F97316' },
  { emoji: '🧨', name: '技术债', color: '#8B5CF6' },
  { emoji: '🧪', name: '实验性', color: '#3B82F6' },
];

// 领域类标签 - 避免碎片化，能看出精力投入分布
export const DOMAIN_TYPE_TAGS = [
  { emoji: '☸️', name: 'Kubernetes', color: '#0EA5E9' },
  { emoji: '🤖', name: 'Agent / LLM', color: '#6366F1' },
  { emoji: '🛡', name: '稳定性', color: '#EC4899' },
  { emoji: '🔐', name: '安全', color: '#DC2626' },
  { emoji: '📊', name: '数据 / 观测', color: '#F59E0B' },
  { emoji: '🧩', name: '架构设计', color: '#14B8A6' },
];

// 工作性质标签 - 区分"产出型"和"救火型"
export const WORK_NATURE_TAGS = [
  { emoji: '🧱', name: '基建', color: '#64748B' },
  { emoji: '🚀', name: '推进中项目', color: '#06B6D4' },
  { emoji: '📝', name: '文档 / 输出', color: '#84CC16' },
  { emoji: '🔍', name: '调研', color: '#A855F7' },
  { emoji: '🧯', name: '故障 / Oncall', color: '#FB923C' },
];

// 标签分类配置
export const TAG_CATEGORIES: Record<TagCategory, { label: string; description: string; tags: typeof DECISION_TYPE_TAGS }> = {
  decision_type: {
    label: '决策类（最重要）',
    description: '帮你判断"先做什么"',
    tags: DECISION_TYPE_TAGS,
  },
  domain_type: {
    label: '领域类（按实际工作）',
    description: '避免碎片化，能看出精力投入分布',
    tags: DOMAIN_TYPE_TAGS,
  },
  work_nature: {
    label: '工作性质',
    description: '区分"产出型"和"救火型"',
    tags: WORK_NATURE_TAGS,
  },
};

// 获取标签分类的标签列表
export const getCategoryTags = (category: TagCategory) => {
  return TAG_CATEGORIES[category]?.tags || [];
};

// 获取所有预定义标签
export const getAllPredefinedTags = () => {
  return [
    ...DECISION_TYPE_TAGS.map(tag => ({ ...tag, category: 'decision_type' as TagCategory })),
    ...DOMAIN_TYPE_TAGS.map(tag => ({ ...tag, category: 'domain_type' as TagCategory })),
    ...WORK_NATURE_TAGS.map(tag => ({ ...tag, category: 'work_nature' as TagCategory })),
  ];
};

// 格式化标签名称（包含emoji）
export const formatTagName = (name: string, emoji?: string) => {
  return emoji ? `${emoji} ${name}` : name;
};

// 从标签名称中提取emoji
export const extractEmojiFromName = (name: string) => {
  const emojiMatch = name.match(/^(\p{Emoji})\s+(.+)$/u);
  return emojiMatch ? { emoji: emojiMatch[1], name: emojiMatch[2] } : { emoji: '', name };
};
