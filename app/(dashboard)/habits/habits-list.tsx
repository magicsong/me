"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { CalendarCheck, CheckCircle2, Trash2 } from 'lucide-react';
import { deleteHabit, completeHabit } from './actions';
import { useRouter } from 'next/navigation';

type Habit = {
  id: string;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  createdAt: string;
  completedToday: boolean;
  streak: number;
};

export function HabitsList({ habits }: { habits: Habit[] }) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState<string | null>(null);
  
  async function handleDeleteHabit() {
    if (habitToDelete) {
      await deleteHabit(habitToDelete);
      router.refresh();
      setDeleteDialogOpen(false);
    }
  }
  
  async function handleCompleteHabit(id: string) {
    await completeHabit(id);
    router.refresh();
  }
  
  function openDeleteDialog(id: string) {
    setHabitToDelete(id);
    setDeleteDialogOpen(true);
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

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名称</TableHead>
            <TableHead className="hidden md:table-cell">频率</TableHead>
            <TableHead className="hidden md:table-cell">连续天数</TableHead>
            <TableHead>今日完成</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {habits.map((habit) => (
            <TableRow key={habit.id}>
              <TableCell className="font-medium">
                {habit.name}
                {habit.description && (
                  <p className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]">
                    {habit.description}
                  </p>
                )}
              </TableCell>
              <TableCell className="hidden md:table-cell capitalize">
                {{
                  daily: '每日',
                  weekly: '每周',
                  monthly: '每月'
                }[habit.frequency]}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {habit.streak} 天
              </TableCell>
              <TableCell>
                <Button
                  variant={habit.completedToday ? "secondary" : "outline"}
                  size="sm"
                  className="gap-1"
                  onClick={() => handleCompleteHabit(habit.id)}
                >
                  <CheckCircle2 className={`h-4 w-4 ${habit.completedToday ? 'text-green-500' : ''}`} />
                  {habit.completedToday ? '已完成' : '完成'}
                </Button>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openDeleteDialog(habit.id)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      
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
    </>
  );
}
