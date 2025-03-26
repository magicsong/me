"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  BatteryFull, BatteryMedium, BatteryLow,
  Smile, Meh, Frown, 
  Moon, CalendarIcon, Sparkles
} from 'lucide-react';
import { fetchDailySummary } from './actions';
import { useToast } from '@/components/hooks/use-toast';
import { useRouter } from 'next/navigation'; // 导入路由器用于刷新页面

type DailySummaryFormProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<{ success: boolean, error?: string }>;
  completedTasks: string[];
  totalTasks: number;
  summaryDate: 'today' | 'yesterday';
};

const emojis = ['😊', '😃', '😐', '😔', '😢'];

export function DailySummaryForm({
  isOpen,
  onClose,
  onSubmit,
  completedTasks,
  totalTasks,
  summaryDate
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
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false); // 添加提交状态跟踪
  const { toast } = useToast();
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const router = useRouter(); // 获取路由实例用于刷新

  // 更新三件好事中的一项
  const updateGoodThing = (index: number, value: string) => {
    const newGoodThings = [...goodThings];
    newGoodThings[index] = value;
    setGoodThings(newGoodThings);
  };

  // 获取日期字符串和显示文本
  const getDateString = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    return summaryDate === 'today' 
      ? today.toISOString().split('T')[0]
      : yesterday.toISOString().split('T')[0];
  };
  
  const getDateDisplay = () => {
    const dateStr = getDateString();
    const [year, month, day] = dateStr.split('-');
    return `${year}年${month}月${day}日 (${summaryDate === 'today' ? '今天' : '昨天'})`;
  };

  // 清空表单
  useEffect(() => {
    if (isOpen) {
      // 打开时重置表单数据
      setCompletionScore(5);
      setGoodThings(['', '', '']);
      setLearnings('');
      setChallenges('');
      setImprovements('');
      setMoodIndex(0);
      setEnergyLevel('medium');
      setSleepQuality('average');
      setTomorrowGoals('');
      setSelectedTasks([]);
    }
  }, [isOpen, summaryDate]);

  // 加载已有总结数据
  useEffect(() => {
    async function loadExistingSummary() {
      if (!isOpen) return;
      
      const dateStr = getDateString();
      setLoading(true);
      
      try {
        const result = await fetchDailySummary(dateStr);
        
        if (result.success && result.data) {
          const summaryData = result.data.content;
          if (result.data.ai_summary){
            summaryData.AiSummary= result.data.ai_summary;
          }
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
          if (summaryData.completedTasks) setSelectedTasks(summaryData.completedTasks);
        } else {
          // 重置表单
          resetForm();
        }
      } catch (error) {
        console.error('加载总结数据失败:', error);
        // 出错时重置表单
        resetForm();
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
    setSelectedTasks([]);
  };

  // 处理表单提交
  const handleSubmit = async () => {
    setSubmitting(true);
    
    const formData = {
      date: getDateString(),
      dateType: summaryDate,
      completedTasks: selectedTasks,
      completionCount: selectedTasks.length,
      completionScore,
      goodThings,
      learnings,
      challenges,
      improvements,
      mood: emojis[moodIndex],
      energyLevel,
      sleepQuality,
      tomorrowGoals
    };
    
    try {
      // 调用父组件提供的onSubmit函数并等待结果
      const result = await onSubmit(formData);
      
      if (result.success) {
        toast({
          title: "保存成功",
          description: "你的日常总结已保存",
        });
        
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

  const handleTaskToggle = (task: string) => {
    setSelectedTasks(prev => 
      prev.includes(task) 
        ? prev.filter(t => t !== task) 
        : [...prev, task]
    );
  };

  // 处理 AI 生成建议 - 修改为使用API调用
  const handleAIAssist = async () => {
    setIsGeneratingAI(true);
    
    try {
      // 准备当前表单数据作为上下文
      const formContext = {
        completedTasks: selectedTasks,
        goodThings: goodThings.filter(item => item.trim()).join(", "),
        learnings,
        challenges,
        mood: emojis[moodIndex],
        dateType: summaryDate
      };
      
      // 将表单数据转换为字符串供AI分析
      const contextString = Object.entries(formContext)
        .filter(([_, value]) => value)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");
      
      // 通过API调用AI生成功能
      const generateAISuggestion = async (prompt: string) => {
        const response = await fetch('/api/ai/summary-suggestions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt }),
        });
      
        if (!response.ok) {
          throw new Error('AI请求失败');
        }
      
        const result = await response.json();
        return result.suggestion;
      };
      
      // 根据不同的空字段生成不同的提示
      if (!learnings && !challenges) {
        // 生成反思建议
        const reflectionPrompt = `以下是我今天的情况：\n${contextString}\n请帮我总结一些今天可能的收获和面临的挑战。`;
        const reflection = await generateAISuggestion(reflectionPrompt);
        
        // 提取建议并填入表单
        const suggestionParts = reflection.split('\n\n');
        if (suggestionParts.length >= 2) {
          setLearnings(suggestionParts[0].replace(/^收获[：:]\s*/i, ''));
          setChallenges(suggestionParts[1].replace(/^挑战[：:]\s*/i, ''));
        } else {
          setLearnings(reflection);
        }
      }
      
      // 如果三件好事为空，生成建议
      if (goodThings.every(thing => !thing.trim())) {
        const goodThingsPrompt = `根据以下信息：\n${contextString}\n请为我生成今天可能的三件好事`;
        const goodThingsSuggestion = await generateAISuggestion(goodThingsPrompt);
        
        // 拆分建议并填入表单
        const suggestions = goodThingsSuggestion
          .split(/\d+[.、)]/g)
          .filter(s => s.trim())
          .slice(0, 3);
          
        if (suggestions.length) {
          setGoodThings(suggestions.map(s => s.trim()));
        }
      }
      
      // 如果明日目标为空，生成建议
      if (!tomorrowGoals) {
        const goalsPrompt = `根据今天的情况：\n${contextString}\n请为我规划明天的3个重要目标`;
        const goalsSuggestion = await generateAISuggestion(goalsPrompt);
        
        setTomorrowGoals(goalsSuggestion.replace(/^明[日天]目标[：:]\s*/i, ''));
      }
      
      // 成功提示
      toast({
        title: "AI 助手",
        description: "已根据你的情况生成建议内容",
      });
    } catch (error) {
      console.error('AI 建议生成失败:', error);
      toast({
        title: "生成失败",
        description: "AI 助手暂时无法提供建议，请稍后再试",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
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
              {/* AI 助手建议按钮 - 添加在表单顶部 */}
              <div className="flex justify-end mb-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleAIAssist}
                  disabled={isGeneratingAI}
                  className="flex items-center gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {isGeneratingAI ? "生成中..." : "AI 建议"}
                </Button>
              </div>

              {/* 1. 今日完成情况 */}
              <div className="space-y-3">
                <h3 className="text-md font-semibold">1️⃣ {summaryDate === 'today' ? '今日' : '昨日'}完成情况</h3>
                
                <div className="space-y-2">
                  <Label>✅ 今天完成了哪些重要任务？</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {completedTasks.length > 0 ? (
                      completedTasks.map((task) => (
                        <div key={task} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`task-${task}`} 
                            checked={selectedTasks.includes(task)}
                            onCheckedChange={() => handleTaskToggle(task)}
                          />
                          <label
                            htmlFor={`task-${task}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {task}
                          </label>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">今天没有完成任何习惯任务</p>
                    )}
                  </div>
                  
                  <div className="flex justify-between text-sm mt-3">
                    <Label>🔢 已选任务数：{selectedTasks.length} / {totalTasks}</Label>
                  </div>
                </div>
                
                <div className="space-y-2">
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
                  <div key={index} className="space-y-1">
                    <Label htmlFor={`good-thing-${index}`}>{index + 1}.</Label>
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
                        className={`text-2xl p-2 rounded-full transition-all ${
                          moodIndex === index ? 'bg-primary/10 scale-110' : 'hover:bg-muted/50'
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
          <Button variant="outline" onClick={onClose}>取消</Button>
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
