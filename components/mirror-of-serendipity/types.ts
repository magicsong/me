// 奇思妙境 - 意外之镜 类型定义

export type AIQuestionMode = 'counterquestion' | 'contrast' | 'misread' | 'risk';

export interface NoteFragment {
  originalContent: string;
  fragmentStart: number;
  fragmentEnd: number;
  fragmentText: string;
  isHidden: boolean; // 是否被折叠模糊
}

export interface AIQuestion {
  mode: AIQuestionMode;
  question: string;
  explanation?: string;
}

export interface MirrorCard {
  id: number;
  userId: string;
  noteId: number;
  noteTitle: string;
  noteContent: string;
  noteCreatedAt: string;
  daysDiff: number; // 距离现在的天数
  fragment: NoteFragment;
  aiQuestion: AIQuestion;
  userAdditions: string[]; // 用户"补一句"的记录
  ignoreCount: number; // 用户点击"忽略"的次数
  lastInteractionAt?: string;
}

export interface UserIgnorePattern {
  userId: string;
  topic: string; // 话题/主题
  ignoreCount: number;
  lastIgnoreAt: string;
  patternDetectedAt?: string; // AI 识别模式的时间
}

export interface LongTermMotif {
  userId: string;
  noteId: number;
  additionCount: number; // 用户补充的次数
  motifTitle?: string;
  createdAt: string;
  updatedAt: string;
}
