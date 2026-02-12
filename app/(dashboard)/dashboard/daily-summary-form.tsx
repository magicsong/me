"use client";

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  BatteryFull, BatteryMedium, BatteryLow,
  Smile, Meh, Frown,
  Moon, CalendarIcon, Sparkles,
  Flower2, CheckCircle2, XCircle
} from 'lucide-react';
import { fetchDailySummary } from './actions';
import { useToast } from '@/components/hooks/use-toast';
import { useRouter } from 'next/navigation';

// 在文件顶部添加类型定义
export type FailedHabit = {
  name: string;
  failReason?: string;
  streak?: number;
  id: string | number;
};

type DailySummaryFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<{ success: boolean, error?: string }>;
  completedTasks: string[];
  failedTasks: string[];
  totalTasks: number;
  summaryDate: 'today' | 'yesterday';
  completedHabits: string[],
  failedHabits: FailedHabit[],
};

const emojis = ['😊', '😃', '😐', '😔', '😢'];

export function DailySummaryForm({
  isOpen,
  onClose,
  onSubmit,
  completedTasks,
  failedTasks,
  totalTasks,
  summaryDate,
  completedHabits,
  failedHabits,
}: DailySummaryFormProps) {
  const [completionScore, setCompletionScore] = useState(5);
  const [goodThings, setGoodThings] = useState(['', '', '']);
  const [learnings, setLearnings] = useState('');
  const [challenges, setChallenges] = useState('');
  const [improvements, setImprovements] = useState('');
  const [moodIndex, setMoodIndex] = useState(0);
  const [energyLevel, setEnergyLevel] = useState('medium');
  const [sleepQuality, setSleepQuality] = useState('average');
  const [tomorrowGoals, setTomorrowGoals] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const router = useRouter();
  
  // 新增：用于追踪表单是否有改动，以及用于自动保存的定时器引用
  const [hasChanges, setHasChanges] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);

  // 获取日期字符串和显示文本
  const getDateString = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    return summaryDate === 'today'
      ? today.toISOString().split('T')[0]
      : yesterday.toISOString().split('T')[0];
  };

  // 获取 localStorage key
  const getDraftKey = () => {
    const dateStr = getDateString();
    return `daily-summary-draft-${dateStr}`;
  };

  // 保存草稿到 localStorage
  const saveDraftToLocalStorage = () => {
    const draftData = {
      completionScore,
      goodThings,
      learnings,
      challenges,
      improvements,
      moodIndex,
      energyLevel,
      sleepQuality,
      tomorrowGoals,
      savedAt: new Date().toISOString(),
    };
    
    try {
      localStorage.setItem(getDraftKey(), JSON.stringify(draftData));
    } catch (error) {
      console.error('保存草稿失败:', error);
    }
  };

  // 从 localStorage 恢复草稿
  const restoreDraftFromLocalStorage = () => {
    try {
      const draftData = localStorage.getItem(getDraftKey());
      if (draftData) {
        const draft = JSON.parse(draftData);
        setCompletionScore(draft.completionScore ?? 5);
        setGoodThings(draft.goodThings ?? ['', '', '']);
        setLearnings(draft.learnings ?? '');
        setChallenges(draft.challenges ?? '');
        setImprovements(draft.improvements ?? '');
        setMoodIndex(draft.moodIndex ?? 0);
        setEnergyLevel(draft.energyLevel ?? 'medium');
        setSleepQuality(draft.sleepQuality ?? 'average');
        setTomorrowGoals(draft.tomorrowGoals ?? '');
        setHasRestoredDraft(true);
        
        // 显示提示信息
        toast({
          title: "已恢复草稿",
          description: "检测到上次未保存的内容，已自动恢复",
        });
        
        return true;
      }
    } catch (error) {
      console.error('恢复草稿失败:', error);
    }
    return false;
  };

  // 清除 localStorage 中的草稿
  const clearDraftFromLocalStorage = () => {
    try {
      localStorage.removeItem(getDraftKey());
    } catch (error) {
      console.error('清除草稿失败:', error);
    }
  };

  // 更新三件好事中的一项
  const updateGoodThing = (index: number, value: string) => {
    const newGoodThings = [...goodThings];
    newGoodThings[index] = value;
    setGoodThings(newGoodThings);
  };

  const getDateDisplay = () => {
    const dateStr = getDateString();
    const [year, month, day] = dateStr.split('-');
    return `${year}年${month}月${day}日 (${summaryDate === 'today' ? '今天' : '昨天'})`;
  };

  // 清空表单
  useEffect(() => {
    if (isOpen) {
      // 打开时尝试恢复草稿
      if (!hasRestoredDraft) {
        const hasDraft = restoreDraftFromLocalStorage();
        
        // 如果没有草稿，则重置表单
        if (!hasDraft) {
          setCompletionScore(5);
          setGoodThings(['', '', '']);
          setLearnings('');
          setChallenges('');
          setImprovements('');
          setMoodIndex(0);
          setEnergyLevel('medium');
          setSleepQuality('average');
          setTomorrowGoals('');
        }
        setHasChanges(false);
      }
    }
  }, [isOpen, summaryDate]);

  type DailySummary = {
    date: string;
    dateType: 'today' | 'yesterday';
    completedTasks: string[];
    completionCount: number;
    completionScore: number;
    goodThings: string[];
    learnings: string;
    challenges: string;
    improvements: string;
    mood: string;
    energyLevel: string;
    sleepQuality: string;
    tomorrowGoals: string;
    failedTasks: string[];
    failedHabits: FailedHabit[];
  };
  
  // 加载已有总结数据
  useEffect(() => {
    async function loadExistingSummary() {
      if (!isOpen) return;

      const dateStr = getDateString();
      setLoading(true);

      try {
        const result = await fetchDailySummary(dateStr);

        if (result.success && result.data) {
          const summaryData = result.data.content as DailySummary;
          // 填充表单数据
          if (summaryData.completionScore) setCompletionScore(summaryData.completionScore);
          if (summaryData.goodThings?.length) setGoodThings(
            // 确保goodThings是一个长度为3的数组
            [...summaryData.goodThings, '', '', ''].slice(0, 3)
          );
          if (summaryData.learnings) setLearnings(summaryData.learnings);
          if (summaryData.challenges) setChallenges(summaryData.challenges);
          if (summaryData.improvements) setImprovements(summaryData.improvements);
          if (summaryData.mood) {
            const moodIdx = emojis.indexOf(summaryData.mood);
            if (moodIdx >= 0) setMoodIndex(moodIdx);
          }
          if (summaryData.energyLevel) setEnergyLevel(summaryData.energyLevel);
          if (summaryData.sleepQuality) setSleepQuality(summaryData.sleepQuality);
          if (summaryData.tomorrowGoals) setTomorrowGoals(summaryData.tomorrowGoals);
          
          // 加载成功后清除草稿
          clearDraftFromLocalStorage();
        } else {
          // 没有已保存的数据，不重置表单，允许草稿恢复生效
          // resetForm();
        }
      } catch (error) {
        console.error('加载总结数据失败:', error);
        // 出错时不重置表单，允许草稿恢复生效
        // resetForm();
      } finally {
        setLoading(false);
      }
    }

    loadExistingSummary();
  }, [isOpen, summaryDate]);

  // 重置表单
  const resetForm = () => {
    setCompletionScore(5);
    setGoodThings(['', '', '']);
    setLearnings('');
    setChallenges('');
    setImprovements('');
    setMoodIndex(0);
    setEnergyLevel('medium');
    setSleepQuality('average');
    setTomorrowGoals('');
  };

  // 新增：定期自动保存草稿
  useEffect(() => {
    if (!isOpen) {
      // 关闭表单时清除定时器
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      return;
    }

    // 标记已有改动
    setHasChanges(true);

    // 清除之前的定时器
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }

    // 立即保存一次
    saveDraftToLocalStorage();

    // 设置定期自动保存（每30秒）
    autoSaveTimerRef.current = setInterval(() => {
      saveDraftToLocalStorage();
    }, 30000);

    return () => {
      // 组件卸载时清除定时器
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [isOpen, completionScore, goodThings, learnings, challenges, improvements, moodIndex, energyLevel, sleepQuality, tomorrowGoals]);

  // 处理表单提交
  const handleSubmit = async () => {
    setSubmitting(true);

    const formData: DailySummary = {
      date: getDateString(),
      dateType: summaryDate,
      completedTasks: completedTasks, // 直接使用传入的已完成任务
      completionCount: completedTasks.length,
      completionScore,
      goodThings,
      learnings,
      challenges,
      improvements,
      mood: emojis[moodIndex],
      energyLevel,
      sleepQuality,
      tomorrowGoals,
      failedTasks: failedTasks, // 使用传入的未完成任务
      failedHabits: failedHabits, // 使用传入的未坚持习惯
    };

    try {
      // 调用父组件提供的onSubmit函数并等待结果
      const result = await onSubmit(formData);

      if (result.success) {
        toast({
          title: "保存成功",
          description: "你的日常总结已保存",
        });

        // 清除草稿
        clearDraftFromLocalStorage();
        
        // 重置标志
        setHasChanges(false);
        setHasRestoredDraft(false);

        // 关闭表单
        onClose();

        // 刷新页面数据以显示最新内容
        router.refresh();
      } else {
        toast({
          title: "保存失败",
          description: result.error || "无法保存总结，请重试",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("保存总结出错:", error);
      toast({
        title: "发生错误",
        description: "保存总结时出现问题",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // 处理表单关闭
  const handleClose = () => {
    // 如果有改动且还有内容，提示用户
    if (hasChanges && (learnings || challenges || improvements || tomorrowGoals || goodThings.some(t => t.trim()))) {
      const confirmed = window.confirm('您有未保存的内容，是否确定关闭？内容将自动保存为草稿，下次打开时会自动恢复。');
      if (!confirmed) {
        return;
      }
    }
    
    // 重置标志
    setHasChanges(false);
    setHasRestoredDraft(false);
    
    // 调用父组件的 onClose
    onClose();
  };

  // 计算完成率
  const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            📋 {summaryDate === 'today' ? '今日总结' : '昨日总结'}
          </DialogTitle>
          <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <CalendarIcon className="h-3 w-3" />
            <span>{getDateDisplay()}</span>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="text-center">
                <div className="spinner h-8 w-8 mx-auto border-4 border-muted rounded-full border-t-primary animate-spin mb-4"></div>
                <p className="text-muted-foreground">加载数据中...</p>
              </div>
            </div>
          ) : (
            <>
              {/* 1. 今日完成情况 */}
              <div className="space-y-3">
                <h3 className="text-md font-semibold">1️⃣ {summaryDate === 'today' ? '今日' : '昨日'}完成情况</h3>

                {/* 任务完成情况 - 两栏布局 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 左侧：已完成任务 */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      已完成的任务
                    </Label>
                    <div className="border rounded-md p-3 bg-slate-50 h-[150px] overflow-y-auto">
                      {completedTasks.length > 0 ? (
                        <div className="space-y-2">
                          {completedTasks.map((task) => (
                            <div key={task} className="flex items-center space-x-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <span className="text-sm">{task}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">没有完成任何任务</p>
                      )}
                    </div>
                  </div>

                  {/* 右侧：未完成任务 */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <XCircle className="h-4 w-4 text-red-500" />
                      未完成的任务
                    </Label>
                    <div className="border rounded-md p-3 bg-slate-50 h-[150px] overflow-y-auto">
                      {failedTasks.length > 0 ? (
                        <div className="space-y-2">
                          {failedTasks.map((task) => (
                            <div key={task} className="flex items-center space-x-2">
                              <XCircle className="h-4 w-4 text-red-500" />
                              <span className="text-sm">{task}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">没有未完成的任务</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 习惯完成情况 - 两栏布局 */}
                {(completedHabits.length > 0 || failedHabits.length > 0) && (
                  <>
                    <h4 className="text-sm font-medium mt-5 mb-2">习惯完成情况</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 左侧：已坚持习惯 */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          已坚持的习惯
                        </Label>
                        <div className="border rounded-md p-3 bg-slate-50/70 h-[180px] overflow-y-auto">
                          {completedHabits.length > 0 ? (
                            <div className="space-y-2">
                              {completedHabits.map((habit) => (
                                <div key={habit} className="flex items-center space-x-2">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                  <span className="text-sm">{habit}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">没有坚持任何习惯</p>
                          )}
                        </div>
                      </div>

                      {/* 右侧：未坚持习惯 */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                          <XCircle className="h-4 w-4 text-amber-500" />
                          未坚持的习惯
                        </Label>
                        <div className="border rounded-md p-3 bg-slate-50/70 h-[120px] overflow-y-auto">
                          {failedHabits.length > 0 ? (
                            <div className="space-y-3">
                              {failedHabits.map((habit) => (
                                <div key={habit.id} className="border-b border-slate-200 pb-2 last:border-none last:pb-0">
                                  <div className="flex items-center space-x-2">
                                    <XCircle className="h-4 w-4 text-amber-500 shrink-0" />
                                    <span className="text-sm font-medium">{habit.name}</span>
                                    {habit.streak > 0 && (
                                      <span className="bg-amber-100 text-amber-800 text-xs px-1.5 py-0.5 rounded-full">
                                        之前已坚持 {habit.streak} 天
                                      </span>
                                    )}
                                  </div>
                                  {habit.failReason && (
                                    <div className="mt-1 ml-6 text-xs text-slate-600">
                                      <span className="text-amber-600 font-medium">未完成原因：</span> {habit.failReason}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">没有未坚持的习惯</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* 任务完成统计信息 */}
                <div className="flex justify-between text-sm mt-5 px-1">
                  <Label>🔢 已完成：{completedTasks.length + completedHabits.length} / {totalTasks}</Label>
                  <Label>📈 完成率：{completionRate}%</Label>
                </div>

                <div className="space-y-2 mt-3">
                  <div className="flex justify-between">
                    <Label>📊 完成度评分 (1-10)</Label>
                    <span className="text-sm font-medium">{completionScore}</span>
                  </div>
                  <Slider
                    value={[completionScore]}
                    min={1}
                    max={10}
                    step={1}
                    onValueChange={(vals) => setCompletionScore(vals[0])}
                  />
                </div>
              </div>

              {/* 2. 三件好事 */}
              <div className="space-y-3">
                <h3 className="text-md font-semibold">2️⃣ 三件好事</h3>

                {[0, 1, 2].map((index) => (
                  <div key={index} className="grid grid-cols-[1fr_5fr] gap-2 items-center">
                    <Label htmlFor={`good-thing-${index}`} className="flex justify-center">
                      <Flower2 />
                    </Label>
                    <Input
                      id={`good-thing-${index}`}
                      placeholder={`今天发生的好事 #${index + 1}`}
                      value={goodThings[index]}
                      onChange={(e) => updateGoodThing(index, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              {/* 3. 今日反思 */}
              <div className="space-y-3">
                <h3 className="text-md font-semibold">3️⃣ {summaryDate === 'today' ? '今日' : '昨日'}反思</h3>

                <div className="space-y-2">
                  <Label htmlFor="learnings">💭 今天有哪些值得记录的收获？</Label>
                  <Textarea
                    id="learnings"
                    placeholder="今天我学到了..."
                    value={learnings}
                    onChange={(e) => setLearnings(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="challenges">❌ 今天遇到了什么挑战？</Label>
                  <Textarea
                    id="challenges"
                    placeholder="今天我遇到的困难是..."
                    value={challenges}
                    onChange={(e) => setChallenges(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="improvements">🔄 如果能重来一次，今天我会怎么做？</Label>
                  <Textarea
                    id="improvements"
                    placeholder="如果重新来过，我会..."
                    value={improvements}
                    onChange={(e) => setImprovements(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              {/* 4. 情绪 & 状态 */}
              <div className="space-y-3">
                <h3 className="text-md font-semibold">4️⃣ 情绪 & 状态</h3>

                <div className="space-y-2">
                  <Label>😊 {summaryDate === 'today' ? '今天' : '昨天'}的整体状态如何？</Label>
                  <div className="flex justify-between p-2 border rounded-md">
                    {emojis.map((emoji, index) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setMoodIndex(index)}
                        className={`text-2xl p-2 rounded-full transition-all ${moodIndex === index ? 'bg-primary/10 scale-110' : 'hover:bg-muted/50'
                          }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="energy-level">🏋️ {summaryDate === 'today' ? '今天' : '昨天'}的精力管理如何？</Label>
                  <RadioGroup
                    id="energy-level"
                    value={energyLevel}
                    onValueChange={setEnergyLevel}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="high" id="energy-high" />
                      <Label htmlFor="energy-high" className="flex items-center gap-1">
                        <BatteryFull className="h-4 w-4 text-green-500" /> 高
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="medium" id="energy-medium" />
                      <Label htmlFor="energy-medium" className="flex items-center gap-1">
                        <BatteryMedium className="h-4 w-4 text-yellow-500" /> 中
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="low" id="energy-low" />
                      <Label htmlFor="energy-low" className="flex items-center gap-1">
                        <BatteryLow className="h-4 w-4 text-red-500" /> 低
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sleep-quality">💤 睡眠质量如何？</Label>
                  <RadioGroup
                    id="sleep-quality"
                    value={sleepQuality}
                    onValueChange={setSleepQuality}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="good" id="sleep-good" />
                      <Label htmlFor="sleep-good" className="flex items-center gap-1">
                        <Moon className="h-4 w-4 text-green-500" /> 好
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="average" id="sleep-average" />
                      <Label htmlFor="sleep-average" className="flex items-center gap-1">
                        <Moon className="h-4 w-4 text-yellow-500" /> 一般
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="poor" id="sleep-poor" />
                      <Label htmlFor="sleep-poor" className="flex items-center gap-1">
                        <Moon className="h-4 w-4 text-red-500" /> 差
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              {/* 5. 明日展望 */}
              <div className="space-y-3">
                <h3 className="text-md font-semibold">5️⃣ {summaryDate === 'today' ? '明日' : '今日'}展望</h3>

                <div className="space-y-2">
                  <Label htmlFor="tomorrow-goals">🎯 {summaryDate === 'today' ? '明天' : '今天'}最重要的 3 个目标</Label>
                  <Textarea
                    id="tomorrow-goals"
                    placeholder="1. 
2. 
3. "
                    value={tomorrowGoals}
                    onChange={(e) => setTomorrowGoals(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>取消</Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || submitting}
          >
            {submitting ? "保存中..." : "保存总结"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
