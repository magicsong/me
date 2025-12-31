'use client';

import { useState, useEffect, useCallback } from 'react';
import { NoteBO } from '@/app/api/types';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import Link from 'next/link';
import { extractRandomFragment, createBlurredText, getDistanceStatement, stripHtmlTags } from './note-fragment';
import { generateDailyAIQuestion, generateDailySeed } from './ai-question-generator';
import { MirrorCard, AIQuestion, NoteFragment } from './types';
import { Plus, X, Sparkles, ExternalLink, Loader2 } from 'lucide-react';

interface MirrorOfSerendipityProps {
  userId?: string;
  notes?: NoteBO[];
  onAddition?: (noteId: number, addition: string) => void;
  onIgnore?: (noteId: number) => void;
}

export function MirrorOfSerendipity({
  userId = 'default-user',
  notes = [],
  onAddition,
  onIgnore,
}: MirrorOfSerendipityProps) {
  const [currentCard, setCurrentCard] = useState<MirrorCard | null>(null);
  const [fragment, setFragment] = useState<NoteFragment | null>(null);
  const [aiQuestion, setAIQuestion] = useState<AIQuestion | null>(null);
  const [userInput, setUserInput] = useState('');
  const [hasInteracted, setHasInteracted] = useState(false);
  const [additions, setAdditions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 计算日期差距
  const calculateDaysDiff = (createdAt: string | undefined): number => {
    if (!createdAt) return 0;
    const noteDate = new Date(createdAt);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - noteDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // 初始化卡片
  useEffect(() => {
    if (notes.length === 0) return;

    const initializeCard = async () => {
      setIsLoading(true);
      try {
        // 从笔记中随机选择一条
        const randomNote = notes[Math.floor(Math.random() * notes.length)];
        const daysDiff = calculateDaysDiff(randomNote.createdAt);

        // 生成片段
        const extractedFragment = extractRandomFragment(randomNote.content || '');
        setFragment(extractedFragment);

        // 调用后端 API 获取 AI 反问
        const response = await fetch('/api/ai/note-summary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            noteId: randomNote.id,
            title: randomNote.title,
            content: randomNote.content,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch AI question');
        }

        const data = await response.json();
        const question: AIQuestion = {
          mode: data.aiQuestion.mode,
          question: data.aiQuestion.question,
        };
        setAIQuestion(question);

        // 构建卡片
        const card: MirrorCard = {
          id: Math.random(),
          userId,
          noteId: randomNote.id as number,
          noteTitle: randomNote.title,
          noteContent: randomNote.content || '',
          noteCreatedAt: randomNote.createdAt || '',
          daysDiff,
          fragment: extractedFragment,
          aiQuestion: question,
          userAdditions: [],
          ignoreCount: 0,
        };

        setCurrentCard(card);
        setAdditions([]);
        setUserInput('');
        setHasInteracted(false);
      } catch (error) {
        console.error('Failed to initialize mirror card:', error);
        // 备用方案：使用本地生成的 AI 问题
        const seed = generateDailySeed(userId);
        const question = generateDailyAIQuestion(seed);
        setAIQuestion(question);
      } finally {
        setIsLoading(false);
      }
    };

    initializeCard();
  }, [notes, userId]);

  // 处理"补一句"
  const handleAddition = useCallback(() => {
    if (!userInput.trim() || !currentCard) return;

    const newAdditions = [...additions, userInput];
    setAdditions(newAdditions);
    setUserInput('');
    setHasInteracted(true);

    onAddition?.(currentCard.noteId, userInput);
  }, [userInput, currentCard, additions, onAddition]);

  // 处理"忽略"
  const handleIgnore = useCallback(() => {
    if (!currentCard) return;
    setHasInteracted(true);
    onIgnore?.(currentCard.noteId);
  }, [currentCard, onIgnore]);

  // 没有笔记
  if (notes.length === 0) {
    return (
      <Card className="overflow-hidden">
        <div className="h-1.5 w-full rainbow-flow rounded-t-md" />
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">暂无笔记来唤起你的回忆</p>
        </CardContent>
      </Card>
    );
  }

  // 加载中
  if (isLoading || !currentCard || !fragment || !aiQuestion) {
    return (
      <Card className="overflow-hidden">
        <div className="h-1.5 w-full rainbow-flow rounded-t-md" />
        
        <div className="bg-primary/5 border-b border-border/50 px-6 py-3">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-primary/70" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              意外之镜
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed ml-6">
            重新理解过去的自己
          </p>
        </div>

        <CardContent className="pt-8 pb-8 flex items-center justify-center min-h-64">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary/70" />
            <p className="text-sm text-muted-foreground">正在思考...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const blurredContent = createBlurredText(fragment.originalContent, fragment);

  return (
    <Card className="overflow-hidden">
      <div className="h-1.5 w-full rainbow-flow rounded-t-md" />
      
      {/* 功能标签 - 视觉区分 */}
      <div className="bg-primary/5 border-b border-border/50 px-6 py-3">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-primary/70" />
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">
            意外之镜
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed ml-6">
          重新理解过去的自己
        </p>
      </div>
      
      {/* 时间标记和笔记标题 */}
      <CardHeader className="pb-3">
        <div className="text-xs text-muted-foreground mb-2">
          {getDistanceStatement(currentCard.daysDiff)}
        </div>
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-xl font-semibold text-foreground leading-tight flex-1">
            {currentCard.noteTitle}
          </h2>
          <Link
            href={`/notes/${currentCard.noteId}`}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors flex-shrink-0 mt-1"
          >
            <span>查看原文</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </CardHeader>

      {/* 笔记内容主体 */}
      <CardContent className="space-y-4 max-h-96 overflow-y-auto pr-2">
        {/* 笔记内容 */}
        <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words font-medium">
          {blurredContent.display}
        </div>

        {/* 用户补充 */}
        {additions.length > 0 && (
          <div className="pt-3 border-t border-border/50">
            <div className="space-y-2">
              {additions.map((addition, idx) => (
                <div key={idx} className="flex gap-2 text-sm">
                  <span className="text-muted-foreground flex-shrink-0">→</span>
                  <span className="text-foreground">{addition}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI 问题 */}
        <div className="pt-3 border-t border-border/50">
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              第三视角
            </div>
            <p className="text-sm leading-relaxed text-foreground italic">
              {aiQuestion.question}
            </p>
          </div>
        </div>
      </CardContent>

      {/* 交互区 */}
      <CardFooter className="flex-col gap-3 border-t border-border/50 px-6 py-4">
        <input
          type="text"
          placeholder="续一句..."
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleAddition();
            }
          }}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
        />

        {/* 两个按钮并排 */}
        <div className="w-full flex gap-2">
          <button
            onClick={handleAddition}
            disabled={!userInput.trim()}
            className="flex-1 flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow-md"
          >
            <Plus className="w-4 h-4" />
            补一句
          </button>
          <button
            onClick={handleIgnore}
            className="px-4 py-2.5 rounded-md border border-border bg-background text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            忽略
          </button>
        </div>
      </CardFooter>
    </Card>
  );
}
