// 笔记片段处理逻辑
import { NoteFragment } from './types';

// 从内容中随机抽取片段
export function extractRandomFragment(content: string): NoteFragment {
  if (!content || content.length < 10) {
    return {
      originalContent: content,
      fragmentStart: 0,
      fragmentEnd: content.length,
      fragmentText: content,
      isHidden: false,
    };
  }

  // 将内容分割成句子
  const sentences = content
    .split(/[。！？\n]+/)
    .filter((s) => s.trim().length > 0)
    .map((s) => s.trim());

  if (sentences.length === 0) {
    return {
      originalContent: content,
      fragmentStart: 0,
      fragmentEnd: content.length,
      fragmentText: content,
      isHidden: false,
    };
  }

  // 随机选择一个或两个句子作为片段
  const startIndex = Math.floor(Math.random() * Math.max(1, sentences.length - 1));
  const endIndex = Math.min(startIndex + Math.floor(Math.random() * 2) + 1, sentences.length);

  const selectedSentences = sentences.slice(startIndex, endIndex);
  const fragmentText = selectedSentences.join('。');

  // 计算在原始内容中的位置
  const fragmentStart = content.indexOf(selectedSentences[0]);
  const lastSentence = selectedSentences[selectedSentences.length - 1];
  const fragmentEnd = content.indexOf(lastSentence) + lastSentence.length;

  return {
    originalContent: content,
    fragmentStart: Math.max(0, fragmentStart),
    fragmentEnd: Math.min(content.length, fragmentEnd),
    fragmentText,
    isHidden: true,
  };
}

// 对文本应用模糊效果（显示时使用）
export function createBlurredText(text: string, fragment: NoteFragment): { display: string; hasFiller: boolean } {
  if (!fragment.isHidden) {
    return { display: text, hasFiller: false };
  }

  const before = text.substring(0, fragment.fragmentStart).trim();
  const fragmentPart = fragment.fragmentText;
  const after = text.substring(fragment.fragmentEnd).trim();

  // 如果前面是"我最担心的是"这样的模式，添加留白
  if (before.endsWith('是') || before.endsWith('了')) {
    return {
      display: `${before} —— ___`,
      hasFiller: true,
    };
  }

  // 其他情况，显示片段后留白
  return {
    display: `${fragmentPart}......`,
    hasFiller: true,
  };
}

// 按日期计算距离感描述
export function getTemporalDistance(daysAgo: number): string {
  if (daysAgo < 1) return '今天的你';
  if (daysAgo < 7) return `${daysAgo} 天前的你`;
  if (daysAgo < 30) {
    const weeks = Math.floor(daysAgo / 7);
    return `${weeks} 周前的你`;
  }
  if (daysAgo < 365) {
    const months = Math.floor(daysAgo / 30);
    return `${months} 个月前的你`;
  }
  const years = Math.floor(daysAgo / 365);
  return `${years} 年前的你`;
}

// 以"距离感"为重点的描述
export function getDistanceStatement(daysAgo: number): string {
  const distance = getTemporalDistance(daysAgo);
  return `这段话来自 ${distance}`;
}
