/**
 * 增强的TODO标签系统类型定义
 */

export type TagCategory = 'decision_type' | 'domain_type' | 'work_nature';

/**
 * 增强的标签接口
 */
export interface EnhancedTag {
  id: number;
  name: string;
  color: string;
  kind: string;
  category?: TagCategory;
  user_id?: string;
  created_at?: string;
}

/**
 * 标签分类配置
 */
export interface TagCategoryConfig {
  value: TagCategory;
  label: string;
  description: string;
  emoji?: string;
}

/**
 * 预定义标签配置
 */
export interface PredefinedTag {
  emoji: string;
  name: string;
  color: string;
  category: TagCategory;
}

/**
 * 必填标签配置
 */
export interface RequiredTagsConfig {
  decision_type: number | null;  // 决策类标签ID
  domain_type: number | null;    // 领域类标签ID
  work_nature: number | null;    // 工作性质标签ID
}

/**
 * 验证必填标签
 */
export const isAllRequiredTagsSelected = (config: RequiredTagsConfig): boolean => {
  return config.decision_type !== null && 
         config.domain_type !== null && 
         config.work_nature !== null;
};

/**
 * 必填标签分类列表
 */
export const REQUIRED_TAG_CATEGORIES: TagCategory[] = [
  'decision_type',
  'domain_type',
  'work_nature'
];

/**
 * 获取分类标签类型的中文名称
 */
export const getCategoryLabel = (category: TagCategory): string => {
  const labels: Record<TagCategory, string> = {
    decision_type: '决策类（最重要）',
    domain_type: '领域类（按实际工作）',
    work_nature: '工作性质',
  };
  return labels[category] || category;
};

/**
 * 获取分类描述
 */
export const getCategoryDescription = (category: TagCategory): string => {
  const descriptions: Record<TagCategory, string> = {
    decision_type: '帮你判断"先做什么"',
    domain_type: '避免碎片化，能看出精力投入分布',
    work_nature: '区分"产出型"和"救火型"',
  };
  return descriptions[category] || '';
};

/**
 * 验证标签是否属于必填分类
 */
export const isRequiredCategory = (category?: TagCategory): boolean => {
  return category !== undefined && REQUIRED_TAG_CATEGORIES.includes(category);
};

/**
 * 从标签列表中提取必填标签
 */
export const extractRequiredTags = (
  tags: EnhancedTag[]
): Record<TagCategory, EnhancedTag | null> => {
  return {
    decision_type: tags.find(t => t.category === 'decision_type') || null,
    domain_type: tags.find(t => t.category === 'domain_type') || null,
    work_nature: tags.find(t => t.category === 'work_nature') || null,
  };
};

/**
 * 按分类分组标签
 */
export const groupTagsByCategory = (
  tags: EnhancedTag[]
): Record<TagCategory, EnhancedTag[]> => {
  return {
    decision_type: tags.filter(t => t.category === 'decision_type'),
    domain_type: tags.filter(t => t.category === 'domain_type'),
    work_nature: tags.filter(t => t.category === 'work_nature'),
  };
};

/**
 * 验证TODO的标签是否满足必填要求
 */
export const validateTodoTags = (
  todoTagIds: number[],
  allTags: EnhancedTag[]
): { valid: boolean; missing: TagCategory[] } => {
  const todoTags = todoTagIds
    .map(id => allTags.find(t => t.id === id))
    .filter((t): t is EnhancedTag => t !== undefined);

  const missing: TagCategory[] = [];

  if (!todoTags.some(t => t.category === 'decision_type')) {
    missing.push('decision_type');
  }
  if (!todoTags.some(t => t.category === 'domain_type')) {
    missing.push('domain_type');
  }
  if (!todoTags.some(t => t.category === 'work_nature')) {
    missing.push('work_nature');
  }

  return {
    valid: missing.length === 0,
    missing,
  };
};
