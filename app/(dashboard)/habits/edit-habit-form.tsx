"use client";

import { useState, useEffect } from 'react';
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
import { Pin } from 'lucide-react'; // 导入Pin图标
import { Slider } from '@/components/ui/slider';
import { updateHabit } from './client-actions';

type Habit = {
  id: string;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  category?: 'health' | 'productivity' | 'mindfulness' | 'learning' | 'social';
  rewardPoints?: number;
  isPinned?: boolean;
  scheduledDays?: number[]; // 特定日期：weekly时为周几(0-6)，monthly时为日期(1-31)
};

interface EditHabitFormProps {
  habit: Habit;
  onSuccess?: () => void;
}

export function EditHabitForm({ habit, onSuccess }: EditHabitFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(habit.name);
  const [description, setDescription] = useState(habit.description || '');
  const [frequency, setFrequency] = useState(habit.frequency);
  const [category, setCategory] = useState(habit.category || 'health');
  const [rewardPoints, setRewardPoints] = useState(habit.rewardPoints || 10);
  const [isPinned, setIsPinned] = useState(habit.isPinned || false);
  const [scheduledDays, setScheduledDays] = useState<number[]>(habit.scheduledDays || []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateHabit(habit.id, {
        name,
        description,
        frequency,
        category,
        rewardPoints,
        isPinned,
        scheduledDays
      });
      onSuccess?.();
    } catch (error) {
      console.error('更新习惯失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">习惯名称</Label>
        <Input 
          id="name" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder="例如：每天喝水" 
          required 
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">描述（可选）</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="为什么要养成这个习惯？"
          className="resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="frequency">频率</Label>
        <Select value={frequency} onValueChange={(value: any) => {
          setFrequency(value);
          // 切换频率时清空已选日期
          setScheduledDays([]);
        }}>
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
      
      {/* 根据频率显示特定日期选择 */}
      {frequency === 'weekly' && (
        <div className="space-y-2">
          <Label>选择具体周几</Label>
          <div className="grid grid-cols-4 gap-2">
            {['周日', '周一', '周二', '周三', '周四', '周五', '周六'].map((day, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  setScheduledDays(prev =>
                    prev.includes(index)
                      ? prev.filter(d => d !== index)
                      : [...prev, index]
                  );
                }}
                className={`p-2 rounded-md border text-sm font-medium transition-colors ${
                  scheduledDays.includes(index)
                    ? 'bg-blue-500 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {scheduledDays.length === 0
              ? '未选择：将在每周每天显示'
              : `已选择: ${scheduledDays.map(d => ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d]).join('、')}`}
          </p>
        </div>
      )}
      
      {frequency === 'monthly' && (
        <div className="space-y-2">
          <Label>选择具体日期</Label>
          <div className="grid grid-cols-6 gap-1">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => {
                  setScheduledDays(prev =>
                    prev.includes(day)
                      ? prev.filter(d => d !== day)
                      : [...prev, day]
                  );
                }}
                className={`p-1.5 rounded-md border text-xs font-medium transition-colors ${
                  scheduledDays.includes(day)
                    ? 'bg-blue-500 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {scheduledDays.length === 0
              ? '未选择：将在每月每天显示'
              : `已选择: ${scheduledDays.sort((a, b) => a - b).join('、')} 号`}
          </p>
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="category">价值类别</Label>
        <Select value={category} onValueChange={setCategory}>
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
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <Label htmlFor="rewardPoints">奖励点数</Label>
          <span className="text-sm font-medium">{rewardPoints} 点</span>
        </div>
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
          {isSubmitting ? '保存中...' : '保存修改'}
        </Button>
      </div>
    </form>
  );
}