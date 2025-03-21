'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { 
  CalendarIcon, 
  Plus, 
  Trash2,
  Target,
  ClipboardList,
  Clock,
  CheckSquare,
  BarChart3,
  Type
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { cn, formatDate } from '@/lib/utils';
import { createNewGoal, updateExistingGoal } from '../actions';

// 表单验证模式
const goalFormSchema = z.object({
  title: z.string().min(1, '请输入目标标题'),
  description: z.string().optional(),
  type: z.enum(['annual', 'quarterly', 'monthly', 'custom']),
  startDate: z.date(),
  endDate: z.date(),
  habitTargets: z.array(
    z.object({
      habitId: z.coerce.number(),
      targetCompletionRate: z.number().min(1).max(100)
    })
  ).min(1, '至少选择一个习惯目标')
});

type GoalFormValues = z.infer<typeof goalFormSchema>;

interface GoalFormProps {
  goal?: any; // 编辑时传入现有目标数据
  habits: Habit[]; // 用户的所有习惯列表
}

export function GoalForm({ goal, habits }: GoalFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 默认表单值
  const defaultValues: Partial<GoalFormValues> = goal
    ? {
        title: goal.title,
        description: goal.description || '',
        type: goal.type,
        startDate: new Date(goal.startDate),
        endDate: new Date(goal.endDate),
        habitTargets: goal.habitTargets.map((target: any) => ({
          habitId: target.habitId,
          targetCompletionRate: target.targetCompletionRate
        }))
      }
    : {
        title: '',
        description: '',
        type: 'monthly',
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        habitTargets: []
      };
  
  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues
  });
  
  // 添加习惯目标
  const addHabitTarget = () => {
    const currentTargets = form.getValues('habitTargets') || [];
    form.setValue('habitTargets', [
      ...currentTargets,
      { habitId: '', targetCompletionRate: 80 }
    ]);
  };
  
  // 移除习惯目标
  const removeHabitTarget = (index: number) => {
    const currentTargets = form.getValues('habitTargets') || [];
    form.setValue('habitTargets', currentTargets.filter((_, i) => i !== index));
  };
  
  // 提交表单
  const onSubmit = async (data: GoalFormValues) => {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('description', data.description || '');
      formData.append('type', data.type);
      formData.append('startDate', data.startDate.toISOString());
      formData.append('endDate', data.endDate.toISOString());
      formData.append('habitTargets', JSON.stringify(data.habitTargets));
      
      if (goal) {
        await updateExistingGoal(goal.id, formData);
      } else {
        await createNewGoal(formData);
      }
      
      router.push('/goals');
      router.refresh();
    } catch (error) {
      console.error('保存目标失败:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-4xl mx-auto">
        <Card className="shadow-md">
          <CardContent className="pt-6">
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center text-base">
                      <Target className="h-5 w-5 mr-2 text-primary" />
                      目标标题
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="输入目标标题..." className="text-lg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center text-base">
                      <ClipboardList className="h-5 w-5 mr-2 text-primary" />
                      目标描述 (选填)
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="描述你的目标..."
                        className="resize-none min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-b py-6">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center text-base">
                        <Type className="h-5 w-5 mr-2 text-primary" />
                        目标类型
                      </FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="选择目标类型" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="annual">年度目标</SelectItem>
                          <SelectItem value="quarterly">季度目标</SelectItem>
                          <SelectItem value="monthly">月度目标</SelectItem>
                          <SelectItem value="custom">自定义</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="flex items-center text-base">
                        <Clock className="h-5 w-5 mr-2 text-primary" />
                        开始日期
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal h-11",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                formatDate(field.value)
                              ) : (
                                <span>选择日期</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="flex items-center text-base">
                        <CalendarIcon className="h-5 w-5 mr-2 text-primary" />
                        结束日期
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal h-11",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                formatDate(field.value)
                              ) : (
                                <span>选择日期</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-base flex items-center">
                    <CheckSquare className="h-5 w-5 mr-2 text-primary" />
                    习惯完成目标
                  </Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addHabitTarget}
                    className="border-primary border-dashed"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    添加习惯
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {form.watch('habitTargets')?.map((_, index) => (
                    <div key={index} className="flex items-end gap-3 p-4 border rounded-md bg-muted/20 hover:bg-muted/30 transition-colors">
                      <div className="flex-1">
                        <Label htmlFor={`habit-${index}`} className="mb-2 block">选择习惯</Label>
                        <Select
                          onValueChange={(value) => {
                            const targets = form.getValues('habitTargets');
                            targets[index].habitId = value;
                            form.setValue('habitTargets', targets);
                          }}
                          value={form.watch(`habitTargets.${index}.habitId`)}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="选择一个习惯" />
                          </SelectTrigger>
                          <SelectContent>
                            {habits.map((habit) => (
                              <SelectItem key={habit.id} value={habit.id}>
                                {habit.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="w-40">
                        <Label htmlFor={`rate-${index}`} className="mb-2 flex items-center">
                          <BarChart3 className="h-4 w-4 mr-1 text-primary" />
                          目标完成率 %
                        </Label>
                        <Input
                          id={`rate-${index}`}
                          type="number"
                          min="1"
                          max="100"
                          className="h-11"
                          value={form.watch(`habitTargets.${index}.targetCompletionRate`)}
                          onChange={(e) => {
                            const targets = form.getValues('habitTargets');
                            targets[index].targetCompletionRate = Number(e.target.value);
                            form.setValue('habitTargets', targets);
                          }}
                        />
                      </div>
                      
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeHabitTarget(index)}
                        className="mb-0.5"
                      >
                        <Trash2 className="h-5 w-5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  
                  {form.watch('habitTargets')?.length === 0 && (
                    <div className="text-center p-8 border border-dashed rounded-md text-muted-foreground flex flex-col items-center justify-center gap-2">
                      <CheckSquare className="h-10 w-10 opacity-40" />
                      请添加至少一个习惯目标
                    </div>
                  )}
                </div>
                {form.formState.errors.habitTargets && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.habitTargets.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-end gap-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.back()}
            className="w-24"
          >
            取消
          </Button>
          <Button type="submit" disabled={isSubmitting} className="w-32">
            {isSubmitting ? '保存中...' : goal ? '更新目标' : '创建目标'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
