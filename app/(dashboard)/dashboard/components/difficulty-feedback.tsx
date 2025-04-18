"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useEffect, useState } from 'react';
import { getHabitDifficultyHistory } from '../../habits/actions';

// 难度评估类型
type DifficultyLevel = 'easy' | 'medium' | 'hard' | null;

// 难度调整建议组件
export function DifficultyFeedback({ habitId, habitName }: { habitId: string, habitName: string }) {
  const [difficultyHistory, setDifficultyHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDifficultyData() {
      try {
        const data = await getHabitDifficultyHistory(Number(habitId));
        setDifficultyHistory(data);
      } catch (error) {
        console.error('加载难度数据失败:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDifficultyData();
  }, [habitId]);

  if (loading || !difficultyHistory) return null;

  // 根据最近的难度评估提供建议
  const { easy, medium, hard, lastFive, recentEvaluations } = difficultyHistory;
  const total = easy + medium + hard;

  if (total < 3) return null; // 数据不足

  // 计算最近5次评估中各难度的比例
  const lastFiveCount = {
    easy: lastFive.filter(d => d === 'easy').length,
    medium: lastFive.filter(d => d === 'medium').length,
    hard: lastFive.filter(d => d === 'hard').length
  };

  let suggestion = null;
  let color = '';

  if (lastFiveCount.easy >= 3) {
    // 绿色区（太简单）
    suggestion = `「${habitName}」对你来说变得容易了！考虑提升10%-20%的难度，例如增加数量或提高质量要求。`;
    color = 'text-green-600';
  } else if (lastFiveCount.hard >= 3) {
    // 红色区（过度困难）
    suggestion = `「${habitName}」似乎有些困难，建议拆分步骤或降低要求，设定更容易达成的小目标。`;
    color = 'text-red-600';
  } else if (lastFiveCount.medium >= 3) {
    // 黄色区（理想边缘）
    suggestion = `「${habitName}」难度适中，正处于成长区间，继续保持这个节奏！`;
    color = 'text-yellow-600';
  }

  // 获取最近一次评价
  const latestComment = recentEvaluations && recentEvaluations[0]?.comment;

  if (!suggestion) return null;

  return (
    <div className={`mt-1 text-xs ${color}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className="cursor-help underline decoration-dotted">
            习惯建议
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>{suggestion}</p>
            {latestComment && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <p className="font-medium text-xs">最近评价:</p>
                <p className="text-xs italic">"{latestComment}"</p>
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
