"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge'; // 添加 Badge 导入
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle, AlertTriangle,
  CalendarIcon, CheckCheck,
  CheckCircle2, Circle,
  ThumbsUp, Trophy
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { completeHabit, getHabitDifficultyHistory, saveHabitDifficulty, getHabitDetail } from '../habits/actions';
import { HabitCalendar } from '../habits/habit-calendar';
import { checkSummaryCompletion, saveDailySummary } from './actions';

// 导入类型定义
type Habit = {
  id: number;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  createdAt: string;
  completedToday: boolean;
  streak: number;
  challenge_tiers?: ChallengeTier[];
  completed_tier?: CompletedTier | null;
};

// 挑战阶梯类型
type ChallengeTier = {
  id: number;
  name: string;
  level: number;
  description?: string;
  reward_points: number;
};

// 完成的挑战阶梯类型
type CompletedTier = {
  id: number;
  name: string;
  level: number;
  reward_points: number;
};

// 难度评估类型
type DifficultyLevel = 'easy' | 'medium' | 'hard' | null;

// Toast 通知组件
function Toast({ message }: { message: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-md shadow-lg"
    >
      {message}
    </motion.div>
  );
}

// 难度评估对话框组件
function DifficultyDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  habitName 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: (difficulty: DifficultyLevel, comment: string) => void;
  habitName: string;
}) {
  const [selected, setSelected] = useState<DifficultyLevel>(null);
  const [comment, setComment] = useState('');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>完成难度评估</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            恭喜完成「{habitName}」！此次完成感觉如何？评估难度可帮助优化习惯设置。
          </p>
          
          <div className="flex gap-3 justify-center mt-6">
            <Button 
              variant={selected === 'easy' ? 'default' : 'outline'} 
              className={`flex-1 ${selected === 'easy' ? 'bg-green-600 hover:bg-green-700' : ''}`}
              onClick={() => setSelected('easy')}
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              简单
            </Button>
            <Button 
              variant={selected === 'medium' ? 'default' : 'outline'} 
              className={`flex-1 ${selected === 'medium' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}`}
              onClick={() => setSelected('medium')}
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              适中
            </Button>
            <Button 
              variant={selected === 'hard' ? 'default' : 'outline'} 
              className={`flex-1 ${selected === 'hard' ? 'bg-red-600 hover:bg-red-700' : ''}`}
              onClick={() => setSelected('hard')}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              困难
            </Button>
          </div>
          
          <div className="mt-6">
            <label className="text-sm text-muted-foreground mb-2 block">
              评价（可选）
            </label>
            <Textarea 
              placeholder="写下你对这次完成的感受或想法..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button 
            variant="ghost" 
            onClick={() => onClose()}
          >
            跳过
          </Button>
          <Button 
            onClick={() => onConfirm(selected, comment)}
            disabled={!selected}
          >
            确认
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 挑战阶梯对话框
function TierSelectionDialog({
  isOpen,
  onClose,
  onConfirm,
  habit
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (habitId: number, tierId: number) => void;
  habit: Habit | null;
}) {
  const [loading, setLoading] = useState(false);
  const [habitDetail, setHabitDetail] = useState<any>(null);
  
  useEffect(() => {
    async function loadHabitDetail() {
      if (!habit) return;
      setLoading(true);
      try {
        const detail = await getHabitDetail(habit.id);
        setHabitDetail(detail);
      } catch (error) {
        console.error('获取习惯详情失败:', error);
      } finally {
        setLoading(false);
      }
    }
    
    if (isOpen && habit) {
      loadHabitDetail();
    }
  }, [isOpen, habit]);
  
  const handleTierSelect = (tierId: number) => {
    if (!habit) return;
    onConfirm(habit.id, tierId);
  };
  
  const getTierColors = (level: number) => {
    return {
      1: 'border-green-500 bg-green-50 hover:bg-green-100',
      2: 'border-amber-500 bg-amber-50 hover:bg-amber-100',
      3: 'border-red-500 bg-red-50 hover:bg-red-100',
    }[level] || 'border-gray-500 bg-gray-50 hover:bg-gray-100';
  };
  
  const getTierLabel = (level: number) => {
    return {
      1: '初级',
      2: '中级',
      3: '高级',
    }[level] || '其他';
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>选择挑战级别</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            为「{habit?.name || ''}」选择一个挑战级别，不同级别将获得不同的奖励点数。
          </p>
          
          {loading ? (
            <div className="flex justify-center p-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : !habitDetail?.challenge_tiers?.length ? (
            <div className="text-center py-6">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p>此习惯暂无挑战级别</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => {
                  // 直接完成普通打卡
                  if (habit) onConfirm(habit.id, 0);
                  onClose();
                }}
              >
                进行普通打卡
              </Button>
            </div>
          ) : (
            <div className="space-y-3 mt-2">
              {habitDetail.challenge_tiers.map((tier: ChallengeTier) => {
                const tierColors = getTierColors(tier.level);
                
                return (
                  <div 
                    key={tier.id} 
                    className={`border-l-4 p-3 rounded-md ${tierColors} cursor-pointer transition-all duration-200`}
                    onClick={() => handleTierSelect(tier.id)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium flex items-center gap-2">
                          {tier.name}
                          <Badge>{getTierLabel(tier.level)}</Badge>
                        </h4>
                        {tier.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {tier.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center">
                        <Badge variant="outline" className="text-amber-600">
                          +{tier.reward_points} 奖励
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              <div 
                className="border p-3 rounded-md bg-gray-50 hover:bg-gray-100 cursor-pointer transition-all duration-200"
                onClick={() => {
                  if (habit) onConfirm(habit.id, 0);
                  onClose();
                }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">普通完成</h4>
                    <p className="text-xs text-muted-foreground">
                      不选择挑战级别，获得标准奖励
                    </p>
                  </div>
                  <Badge variant="outline">
                    +{habit?.rewardPoints || 10} 奖励
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 难度调整建议组件
function DifficultyFeedback({ habitId, habitName }: { habitId: string, habitName: string }) {
  const [difficultyHistory, setDifficultyHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function loadDifficultyData() {
      try {
        const data = await getHabitDifficultyHistory(habitId);
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

// 习惯打卡卡片组件
export function HabitCheckInCard({ 
  habits, 
  completedCount, 
  totalCount 
}: { 
  habits: Habit[]; 
  completedCount: number;
  totalCount: number;
}) {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const [animatingHabitId, setAnimatingHabitId] = useState<number | null>(null);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const progress = totalCount > 0 ? (completedCount / totalCount * 100) : 0;
  
  // 难度评估对话框状态
  const [difficultyDialogOpen, setDifficultyDialogOpen] = useState(false);
  const [currentHabit, setCurrentHabit] = useState<Habit | null>(null);

  // 挑战选择对话框状态
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  
  // 每日总结状态
  const [completedSummaries, setCompletedSummaries] = useState<{[key: string]: boolean}>({});
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [summaryDate, setSummaryDate] = useState<'today' | 'yesterday'>('today');
  
  // 今天和昨天的日期字符串
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  // 从数据库加载总结完成状态
  useEffect(() => {
    async function loadSummaryStatus() {
      try {
        const result = await checkSummaryCompletion([todayStr, yesterdayStr]);
        if (result.success) {
          setCompletedSummaries(result.data);
        }
      } catch (error) {
        console.error('加载总结状态失败:', error);
      }
    }
    
    loadSummaryStatus();
  }, [todayStr, yesterdayStr]);
   
  // 默认选择第一个习惯展示日历
  useEffect(() => {
    if (habits.length > 0 && !selectedHabit) {
      setSelectedHabit(habits[0]);
    }
  }, [habits, selectedHabit]);

  // 处理习惯点击 - 显示日历
  const handleHabitClick = (habit: Habit) => {
    setSelectedHabit(habit);
  };
  
  // 处理打卡开始
  function handleCheckInStart(e: React.MouseEvent, habit: Habit) {
    e.stopPropagation(); // 阻止冒泡，避免同时触发打开日历
    if (habit.completedToday) return;
    
    // 查看习惯是否有挑战阶梯
    if (habit.challenge_tiers && habit.challenge_tiers.length > 0) {
      // 打开挑战选择对话框
      setCurrentHabit(habit);
      setTierDialogOpen(true);
    } else {
      // 直接完成普通打卡
      handleCheckIn(habit.id);
    }
  }
  
  // 处理打卡完成
  async function handleCheckIn(habitId: number, tierId?: number) {
    setAnimatingHabitId(habitId);
    
    try {
      // 完成打卡，可能带有特定的挑战阶梯ID
      await completeHabit(habitId, tierId);
      
      // 获取对应的习惯
      const habit = habits.find(h => h.id === habitId);
      if (!habit) return;
      
      // 打开难度评估对话框
      setCurrentHabit(habit);
      setDifficultyDialogOpen(true);
      
      setToast("🎉 已完成！继续加油！");
      
      // 3秒后清除通知
      setTimeout(() => {
        setToast(null);
      }, 3000);
      
      // 刷新页面数据
      router.refresh();
    } catch (error) {
      console.error('打卡失败:', error);
    } finally {
      // 动画结束后清除状态
      setTimeout(() => {
        setAnimatingHabitId(null);
      }, 500);
    }
  }
  
  // 处理难度评估确认
  async function handleDifficultyConfirm(difficulty: DifficultyLevel, comment: string) {
    if (currentHabit && difficulty) {
      try {
        // 使用新的专用函数保存难度评估
        await saveHabitDifficulty(String(currentHabit.id), difficulty, comment);
        // 刷新数据
        router.refresh();
      } catch (error) {
        console.error('保存难度评估失败:', error);
      }
    }
    setDifficultyDialogOpen(false);
    setCurrentHabit(null);
  }

  // 处理每日总结提交
  async function handleSummarySubmit(data: any) {
    // 确定要标记为完成的日期
    const dateToMark = summaryDate === 'today' ? todayStr : yesterdayStr;
    
    try {
      // 保存到数据库
      const result = await saveDailySummary(dateToMark, data);
      
      if (result.success) {
        // 更新本地状态
        const updatedSummaries = {
          ...completedSummaries,
          [dateToMark]: true
        };
        setCompletedSummaries(updatedSummaries);
        
        // 显示成功通知
        setToast("📝 总结已保存！");
        setSummaryDialogOpen(false);
        
        // 刷新页面数据
        router.refresh();
        
        // 返回成功结果
        return { success: true };
      } else {
        // 显示错误通知
        setToast("❌ 保存失败: " + (result.error || "未知错误"));
        
        // 返回错误结果
        return { success: false, error: result.error || "未知错误" };
      }
    } catch (error) {
      console.error('保存总结失败:', error);
      setToast("❌ 保存失败，请重试");
      
      // 返回错误结果
      return { success: false, error: "保存过程中发生错误" };
    }
  }

  return (
    <>
      <AnimatePresence>
        {toast && <Toast message={toast} />}
      </AnimatePresence>
      
      {/* 难度评估对话框 */}
      {currentHabit && (
        <DifficultyDialog 
          isOpen={difficultyDialogOpen}
          onClose={() => setDifficultyDialogOpen(false)}
          onConfirm={handleDifficultyConfirm}
          habitName={currentHabit.name}
        />
      )}

      {/* 挑战选择对话框 */}
      <TierSelectionDialog 
        isOpen={tierDialogOpen}
        onClose={() => setTierDialogOpen(false)}
        onConfirm={handleCheckIn}
        habit={currentHabit}
      />
      
      <div className="flex flex-col md:flex-row gap-4 w-full">
        <Card className="flex-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">📅 今日习惯打卡（ {completedCount} / {totalCount} 已完成）</CardTitle>
            </div>
            <div className="flex items-center justify-between mt-2">
              <Progress 
                value={progress} 
                className="h-2 flex-1" 
                style={{ 
                  background: 'rgba(200, 200, 200, 0.2)',
                  '--progress-background': 'linear-gradient(to right, #5c6bc0, #3949ab)'
                } as React.CSSProperties} 
              />
              <span className="text-sm ml-2 text-muted-foreground">{Math.round(progress)}%</span>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            {habits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                还没有习惯，去添加一些吧！
              </div>
            ) : (
              habits.map((habit) => (
                <motion.div
                  key={habit.id}
                  layout
                  initial={{ scale: 1 }}
                  animate={{ 
                    scale: animatingHabitId === habit.id ? [1, 1.05, 1] : 1,
                    opacity: habit.completedToday ? 0.7 : 1
                  }}
                  transition={{ duration: 0.3 }}
                  className={`flex items-center p-3 rounded-md cursor-pointer border ${
                    selectedHabit?.id === habit.id ? 'border-primary bg-primary/5' :
                    habit.completedToday 
                      ? 'bg-muted border-muted text-muted-foreground' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handleHabitClick(habit)}
                >
                  <div className="flex-shrink-0 mr-3">
                    {habit.completedToday ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1, rotate: [0, 15, 0] }}
                        transition={{ duration: 0.4 }}
                      >
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                      </motion.div>
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="font-medium">{habit.name}</div>
                    {habit.description && (
                      <div className="text-xs text-muted-foreground">{habit.description}</div>
                    )}
                    
                    {/* 显示已完成的挑战级别 */}
                    {habit.completedToday && habit.completed_tier && (
                      <div className="flex items-center gap-1 mt-1">
                        <Trophy className="h-3 w-3 text-amber-500" />
                        <span className="text-xs font-medium text-amber-600">
                          挑战已完成: {habit.completed_tier.name}
                        </span>
                        <Badge variant="outline" className="text-xs ml-1 h-5 px-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100">
                          +{habit.completed_tier.reward_points}
                        </Badge>
                      </div>
                    )}
                    
                    {/* 添加难度建议显示 */}
                    {habit.completedToday && (
                      <DifficultyFeedback habitId={String(habit.id)} habitName={habit.name} />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-muted-foreground">
                      {habit.streak > 0 && `${habit.streak}天`}
                    </div>
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    
                    {!habit.completedToday && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="ml-2 h-8"
                        onClick={(e) => handleCheckInStart(e, habit)}
                      >
                        <CheckCheck className="h-4 w-4 mr-1" />
                        打卡
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>
        
        {/* 移动端显示 - 展开收起式日历 */}
        <div className="block md:hidden w-full">
          {selectedHabit && (
            <Card className="w-full">
              <HabitCalendar 
                habit={selectedHabit} 
                onClose={() => setSelectedHabit(null)} 
              />
            </Card>
          )}
        </div>
        
        {/* 桌面端显示 - 右侧内容 */}
        <div className="hidden md:flex md:flex-col md:w-5/12 lg:w-2/5 gap-4">       
          {/* 日历卡片 */}
          {selectedHabit && (
            <Card className="w-full">
              <HabitCalendar 
                habit={selectedHabit} 
                onClose={() => {}} 
                className="sticky top-20 w-full"
              />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
