// 笔记片段处理逻辑
import { NoteFragment } from './types';

// 清理HTML标记，转换为可阅读的文本
export function stripHtmlTags(html: string): string {
  // 移除脚本和样式标签及其内容
  let text = html.replace(/<script[^>]*>.*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>.*?<\/style>/gi, '');
  
  // 替换常见的HTML标记为可读形式
  text = text.replace(/<h[1-6][^>]*>([^<]*)<\/h[1-6]>/gi, '\n$1\n');
  text = text.replace(/<p[^>]*>([^<]*)<\/p>/gi, '\n$1\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<li[^>]*>([^<]*)<\/li>/gi, '\n• $1');
  text = text.replace(/<[^>]+>/g, '');
  
  // 清理多余的空白和换行
  text = text.replace(/\n\n+/g, '\n').trim();
  
  return text;
}

// 从内容中随机抽取片段
export function extractRandomFragment(content: string): NoteFragment {
  // 先清理HTML标记
  const cleanContent = stripHtmlTags(content);
  if (!cleanContent || cleanContent.length < 10) {
    return {
      originalContent: cleanContent,
      fragmentStart: 0,
      fragmentEnd: cleanContent.length,
      fragmentText: cleanContent,
      isHidden: false,
    };
  }

  // 将内容分割成句子
  const sentences = cleanContent
    .split(/[。！？\n]+/)
    .filter((s) => s.trim().length > 0)
    .map((s) => s.trim());

  if (sentences.length === 0) {
    return {
      originalContent: cleanContent,
      fragmentStart: 0,
      fragmentEnd: cleanContent.length,
      fragmentText: cleanContent,
      isHidden: false,
    };
  }

  // 随机选择 2-4 个句子作为片段（增加展示内容量）
  const startIndex = Math.floor(Math.random() * Math.max(1, sentences.length - 2));
  const endIndex = Math.min(startIndex + Math.floor(Math.random() * 3) + 2, sentences.length);

  const selectedSentences = sentences.slice(startIndex, endIndex);
  const fragmentText = selectedSentences.join('。');

  // 计算在原始内容中的位置
  const fragmentStart = cleanContent.indexOf(selectedSentences[0]);
  const lastSentence = selectedSentences[selectedSentences.length - 1];
  const fragmentEnd = cleanContent.indexOf(lastSentence) + lastSentence.length;

  return {
    originalContent: cleanContent,
    fragmentStart: Math.max(0, fragmentStart),
    fragmentEnd: Math.min(cleanContent.length, fragmentEnd),
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

  // 显示更多上下文：前面内容 + 片段 + 部分后续内容
  let display = '';
  
  if (before) {
    display += before;
  }
  
  display += (before ? '\n' : '') + fragmentPart;
  
  // 添加部分后续内容（最多100个字），用省略号表示隐藏
  if (after) {
    const afterPreview = after.length > 100 ? after.substring(0, 100) + '...' : after;
    display += '\n' + afterPreview;
  }

  return {
    display,
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
