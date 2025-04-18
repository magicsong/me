"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Award, BarChart, BookOpen, Brain, CalendarCheck, CheckCircle2, Heart, Pencil, Trash2, Trophy, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { deleteHabit, getHabitDetail } from './actions';
import { completeHabit } from './client-actions';
import { HabitChallengeDialog } from './components/habit-challenge-dialog';
import { EditHabitForm } from './edit-habit-form';

type Habit = {
  id: number;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  createdAt: string;
  completedToday: boolean;
  streak: number;
  category?: 'health' | 'productivity' | 'mindfulness' | 'learning' | 'social';
  rewardPoints?: number;
  challenge_tiers?: any[];
  completed_tier?: {
    id: number;
    name: string;
    level: number;
    reward_points: number;
  } | null;
};

export function HabitsList({ habits }: { habits: Habit[] }) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState<number | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [habitToEdit, setHabitToEdit] = useState<Habit | null>(null);
  const [habitDetail, setHabitDetail] = useState<Habit | null>(null);
  const [challengeDialogOpen, setChallengeDialogOpen] = useState(false);
  
  async function handleDeleteHabit() {
    if (habitToDelete) {
      await deleteHabit(habitToDelete);
      router.refresh();
      setDeleteDialogOpen(false);
    }
  }
  
  async function handleCompleteHabit(id: number) {
    await completeHabit(id);
    router.refresh();
  }
  
  function openDeleteDialog(id: number) {
    setHabitToDelete(id);
    setDeleteDialogOpen(true);
  }

  function openEditDialog(habit: Habit) {
    setHabitToEdit(habit);
    setEditDialogOpen(true);
  }

  async function handleViewHabitDetail(id: number) {
    try {
      const detail = await getHabitDetail(id);
      setHabitDetail(detail);
      setChallengeDialogOpen(true);
    } catch (error) {
      console.error('获取习惯详情失败:', error);
    }
  }

  async function refreshHabitDetail() {
    if (habitDetail) {
      const updatedDetail = await getHabitDetail(habitDetail.id);
      setHabitDetail(updatedDetail);
      router.refresh();
    }
  }

  function getCategoryStyles(category?: string) {
    switch (category) {
      case 'health':
        return { icon: <Heart className="h-5 w-5" />, color: 'border-red-500', bgColor: 'bg-red-50', textColor: 'text-red-700' };
      case 'productivity':
        return { icon: <Award className="h-5 w-5" />, color: 'border-amber-500', bgColor: 'bg-amber-50', textColor: 'text-amber-700' };
      case 'mindfulness':
        return { icon: <Brain className="h-5 w-5" />, color: 'border-blue-500', bgColor: 'bg-blue-50', textColor: 'text-blue-700' };
      case 'learning':
        return { icon: <BookOpen className="h-5 w-5" />, color: 'border-green-500', bgColor: 'bg-green-50', textColor: 'text-green-700' };
      case 'social':
        return { icon: <Users className="h-5 w-5" />, color: 'border-purple-500', bgColor: 'bg-purple-50', textColor: 'text-purple-700' };
      default:
        return { icon: <Award className="h-5 w-5" />, color: 'border-gray-500', bgColor: 'bg-gray-50', textColor: 'text-gray-700' };
    }
  }

  function getCategoryName(category?: string) {
    switch (category) {
      case 'health': return '健康';
      case 'productivity': return '效率';
      case 'mindfulness': return '心灵';
      case 'learning': return '学习';
      case 'social': return '社交';
      default: return '其他';
    }
  }

  if (habits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <CalendarCheck className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">还没有习惯</h3>
        <p className="text-muted-foreground mt-2">
          创建你的第一个习惯，开始培养健康的生活方式。
        </p>
      </div>
    );
  }

  const calculateProgress = (streak: number) => {
    const target = 30;
    const progress = Math.min((streak / target) * 100, 100);
    return Math.round(progress);
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <Link href="/habits/analysis">
          <Button variant="outline" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            习惯分析
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {habits.map((habit) => {
          const categoryStyles = getCategoryStyles(habit.category);
          const progress = calculateProgress(habit.streak);
          
          return (
            <Card 
              key={habit.id} 
              className={`overflow-hidden ${categoryStyles.color} border-l-4 hover:shadow-md transition-shadow`}
            >
              <CardHeader className={`${categoryStyles.bgColor} pb-2`}>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded-full ${categoryStyles.bgColor}`}>
                      {categoryStyles.icon}
                    </div>
                    <div>
                      <h3 className="font-medium text-lg flex items-center gap-2">
                        {habit.name}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="ml-1">+{habit.rewardPoints || 10}</Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              完成可获得 {habit.rewardPoints || 10} 点奖励
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className={categoryStyles.textColor}>{getCategoryName(habit.category)}</span>
                        <span>·</span>
                        <span>
                          {{
                            daily: '每日',
                            weekly: '每周',
                            monthly: '每月'
                          }[habit.frequency]}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(habit)}
                      title="编辑"
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDeleteDialog(habit.id)}
                      title="删除"
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {habit.description && (
                  <p className="text-sm text-muted-foreground mb-4">{habit.description}</p>
                )}
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <CalendarCheck className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">连续: {habit.streak} 天</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => handleViewHabitDetail(habit.id)}
                    >
                      <Trophy className="h-4 w-4" />
                      挑战
                    </Button>
                    <Button
                      variant={habit.completedToday ? "secondary" : "outline"}
                      size="sm"
                      className="gap-1"
                      onClick={() => handleCompleteHabit(habit.id)}
                    >
                      <CheckCircle2 className={`h-4 w-4 ${habit.completedToday ? 'text-green-500' : ''}`} />
                      {habit.completedToday ? '已完成' : '完成'}
                    </Button>
                  </div>
                </div>
                
                {/* 添加已完成挑战显示 */}
                {habit.completedToday && habit.completed_tier && (
                  <div className="mt-2 flex items-center gap-2 bg-amber-50 rounded-md p-2 border border-amber-200 animate-pulse">
                    <div className="flex items-center gap-1">
                      <Trophy className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium text-amber-700">
                        已完成挑战: {habit.completed_tier.name}
                      </span>
                    </div>
                    <Badge className="bg-amber-500">+{habit.completed_tier.reward_points}分</Badge>
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-0 pb-4">
                <div className="w-full">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>习惯养成进度</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress 
                    value={progress} 
                    className={`h-2 ${categoryStyles.color.replace('border', 'bg')}`} 
                  />
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              你确定要删除这个习惯吗？此操作不可撤销，所有相关的进度记录将被删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteHabit} className="bg-destructive text-destructive-foreground">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>编辑习惯</DialogTitle>
            <DialogDescription>
              修改习惯的详细信息。
            </DialogDescription>
          </DialogHeader>
          {habitToEdit && (
            <EditHabitForm 
              habit={habitToEdit} 
              onSuccess={() => {
                setEditDialogOpen(false);
                router.refresh();
              }} 
            />
          )}
        </DialogContent>
      </Dialog>

      <HabitChallengeDialog 
        isOpen={challengeDialogOpen}
        habitDetail={habitDetail}
        onClose={() => setChallengeDialogOpen(false)}
        onRefresh={refreshHabitDetail}
      />
    </>
  );
}
