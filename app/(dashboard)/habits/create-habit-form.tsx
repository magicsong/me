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
import { Switch } from '@/components/ui/switch'; // 导入Switch组件
import { createHabit } from './actions';
import { useRouter } from 'next/navigation';
import { Slider } from '@/components/ui/slider';
import { Pin } from 'lucide-react'; // 导入Pin图标

interface CreateHabitFormProps {
  onSuccess?: () => void;
}

export function CreateHabitForm({ onSuccess }: CreateHabitFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rewardPoints, setRewardPoints] = useState(10);
  const [isPinned, setIsPinned] = useState(false); // 添加置顶状态

  async function handleSubmit(formData: FormData) {
    setIsSubmitting(true);
    try {
      // 将isPinned值添加到表单数据
      formData.append('isPinned', isPinned.toString());
      
      await createHabit(formData);
      router.refresh();
      // 清空表单
      (document.getElementById('habit-form') as HTMLFormElement).reset();
      // 重置isPinned状态
      setIsPinned(false);
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
      
      {/* 价值属性 */}
      <div className="space-y-2">
        <Label htmlFor="category">价值类别</Label>
        <Select name="category" defaultValue="health">
          <SelectTrigger id="category">
            <SelectValue placeholder="选择价值类别" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="health">健康</SelectItem>
            <SelectItem value="productivity">效率</SelectItem>
            <SelectItem value="mindfulness">心灵</SelectItem>
            <SelectItem value="learning">学习</SelectItem>
            <SelectItem value="social">社交</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* 添加置顶开关 */}
      <div className="flex items-center justify-between space-y-0 rounded-md border p-4">
        <div className="space-y-0.5">
          <div className="flex items-center">
            <Label htmlFor="isPinned" className="text-base">置顶习惯</Label>
            <Pin className="ml-2 h-4 w-4 text-amber-500" />
          </div>
          <p className="text-sm text-muted-foreground">
            置顶的习惯会优先显示在习惯列表顶部
          </p>
        </div>
        <Switch
          id="isPinned"
          checked={isPinned}
          onCheckedChange={setIsPinned}
        />
      </div>
      
      {/* 奖励点数 */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label htmlFor="rewardPoints">奖励点数</Label>
          <span className="text-sm font-medium">{rewardPoints} 点</span>
        </div>
        <input type="hidden" name="rewardPoints" value={rewardPoints} />
        <Slider
          id="rewardPoints"
          min={1}
          max={20}
          step={1}
          value={[rewardPoints]}
          onValueChange={(values) => setRewardPoints(values[0])}
          className="py-4"
        />
        <p className="text-xs text-muted-foreground">设置完成此习惯后获得的奖励点数。点数越高表示习惯越重要或越难完成。</p>
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