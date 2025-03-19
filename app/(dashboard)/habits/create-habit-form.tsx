"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createHabit } from './actions';
import { useRouter } from 'next/navigation';

interface CreateHabitFormProps {
  onSuccess?: () => void;
}

export function CreateHabitForm({ onSuccess }: CreateHabitFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    try {
      await createHabit(formData);
      router.refresh();
      // 清空表单
      (document.getElementById('habit-form') as HTMLFormElement).reset();
      // 调用成功回调
      onSuccess?.();
    } catch (error) {
      console.error('创建习惯失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form id="habit-form" action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">习惯名称</Label>
        <Input id="name" name="name" placeholder="例如：每天喝水" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">描述（可选）</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="为什么要养成这个习惯？"
          className="resize-none"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="frequency">频率</Label>
        <Select name="frequency" defaultValue="daily">
          <SelectTrigger id="frequency">
            <SelectValue placeholder="选择频率" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">每日</SelectItem>
            <SelectItem value="weekly">每周</SelectItem>
            <SelectItem value="monthly">每月</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? '创建中...' : '创建习惯'}
        </Button>
      </div>
    </form>
  );
}
