"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award, Heart, BookOpen, Brain, Users, Sparkles } from 'lucide-react';
import { getUserRewards } from './actions';

type CategoryData = {
  category: string;
  points: number;
  label: string;
  icon: React.ReactNode;
  color: string;
};

export function RewardsStats() {
  const [rewards, setRewards] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    async function loadRewards() {
      setIsLoading(true);
      try {
        const data = await getUserRewards();
        setRewards(data);
      } catch (error) {
        console.error('加载奖励数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadRewards();
  }, []);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center gap-2">
            <Award className="h-5 w-5" />
            奖励与成就
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!rewards) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center gap-2">
            <Award className="h-5 w-5" />
            奖励与成就
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>当你完成习惯后，将在这里累积奖励点数</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const totalPoints = rewards.totalPoints || 0;
  
  // 定义类别数据
  const categories: CategoryData[] = [
    { 
      category: 'health', 
      points: rewards.categoryPoints?.health || 0, 
      label: '健康', 
      icon: <Heart className="h-4 w-4" />, 
      color: 'text-red-500 bg-red-100 dark:bg-red-900/30'
    },
    { 
      category: 'productivity', 
      points: rewards.categoryPoints?.productivity || 0, 
      label: '效率', 
      icon: <Award className="h-4 w-4" />, 
      color: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30'
    },
    { 
      category: 'mindfulness', 
      points: rewards.categoryPoints?.mindfulness || 0, 
      label: '心灵', 
      icon: <Brain className="h-4 w-4" />, 
      color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30'
    },
    { 
      category: 'learning', 
      points: rewards.categoryPoints?.learning || 0, 
      label: '学习', 
      icon: <BookOpen className="h-4 w-4" />, 
      color: 'text-green-500 bg-green-100 dark:bg-green-900/30'
    },
    { 
      category: 'social', 
      points: rewards.categoryPoints?.social || 0, 
      label: '社交', 
      icon: <Users className="h-4 w-4" />, 
      color: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30'
    }
  ];
  
  // 排序并过滤掉零点数的类别
  const sortedCategories = categories
    .filter(cat => cat.points > 0)
    .sort((a, b) => b.points - a.points);
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center gap-2">
          <Award className="h-5 w-5" />
          奖励与成就
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-3">
          <div className="relative mx-auto w-20 h-20 mb-2">
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-yellow-500" />
            </div>
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle
                className="text-muted stroke-current"
                strokeWidth="10"
                fill="transparent"
                r="40"
                cx="50"
                cy="50"
              />
              <circle
                className="text-primary stroke-current"
                strokeWidth="10"
                strokeLinecap="round"
                fill="transparent"
                r="40"
                cx="50"
                cy="50"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - Math.min(1, totalPoints / 1000))}`}
                transform="rotate(-90 50 50)"
              />
            </svg>
          </div>
          <div className="font-bold text-2xl">{totalPoints}</div>
          <div className="text-sm text-muted-foreground">总奖励点数</div>
          
          <div className="h-[1px] bg-border my-4" />
          
          {sortedCategories.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 mt-2">
              {sortedCategories.map((category) => (
                <div 
                  key={category.category} 
                  className={`rounded-lg p-2 flex flex-col items-center ${category.color}`}
                >
                  <div className="flex items-center gap-1 mb-1">
                    {category.icon}
                    <span className="text-xs font-medium">{category.label}</span>
                  </div>
                  <span className="font-bold">{category.points}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              完成习惯以获得不同类别的奖励点数
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
