"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  AlertTriangle,
  ThumbsUp,
  Trophy,
} from "lucide-react";
import { getHabitDetail } from "../../habits/actions";

// 类型定义
type DifficultyLevel = "easy" | "medium" | "hard" | null;

type Habit = {
  id: number;
  name: string;
  description?: string;
  frequency: "daily" | "weekly" | "monthly";
  createdAt: string;
  completedToday: boolean;
  streak: number;
  challenge_tiers?: ChallengeTier[];
  completed_tier?: CompletedTier | null;
  rewardPoints?: number;
};

type ChallengeTier = {
  id: number;
  name: string;
  level: number;
  description?: string;
  reward_points: number;
};

type CompletedTier = {
  id: number;
  name: string;
  level: number;
  reward_points: number;
};

type DialogStep = "challenge" | "difficulty";

type HabitCompletionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  habit: Habit | null;
  onComplete: (habitId: number, tierId?: number) => Promise<void>;
  onDifficultySubmit: (difficulty: DifficultyLevel, comment: string) => Promise<void>;
};

export function HabitCompletionDialog({
  isOpen,
  onClose,
  habit,
  onComplete,
  onDifficultySubmit,
}: HabitCompletionDialogProps) {
  // 状态管理
  const [step, setStep] = useState<DialogStep>("challenge");
  const [loading, setLoading] = useState(false);
  const [habitDetail, setHabitDetail] = useState<any>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>(null);
  const [comment, setComment] = useState("");

  // 当对话框打开时加载习惯详情
  useEffect(() => {
    async function loadHabitDetail() {
      if (!habit) return;
      setLoading(true);
      try {
        const detail = await getHabitDetail(habit.id);
        setHabitDetail(detail);
      } catch (error) {
        console.error("获取习惯详情失败:", error);
      } finally {
        setLoading(false);
      }
    }

    if (isOpen && habit) {
      loadHabitDetail();
    }
  }, [isOpen, habit]);

  // 当对话框开启时重置状态
  useEffect(() => {
    if (isOpen) {
      // 判断是否有挑战阶梯，如果没有直接进入难度评估
      if (habit && (!habit.challenge_tiers || habit.challenge_tiers.length === 0)) {
        setStep("difficulty");
      } else {
        setStep("challenge");
      }
      setSelectedDifficulty(null);
      setComment("");
    }
  }, [isOpen, habit]);

  // 处理挑战选择
  const handleTierSelect = async (tierId: number) => {
    if (!habit) return;
    
    try {
      // 完成习惯（带有挑战ID）
      await onComplete(habit.id, tierId);
      // 切换到难度评估
      setStep("difficulty");
    } catch (error) {
      console.error("完成习惯失败:", error);
    }
  };

  // 处理难度评估提交
  const handleDifficultySubmit = async () => {
    if (!selectedDifficulty) return;
    
    try {
      await onDifficultySubmit(selectedDifficulty, comment);
      handleClose();
    } catch (error) {
      console.error("提交难度评估失败:", error);
    }
  };

  // 处理关闭对话框
  const handleClose = () => {
    setStep("challenge");
    setSelectedDifficulty(null);
    setComment("");
    onClose();
  };

  // 处理直接打卡（跳过挑战选择）
  const handleStandardCompletion = async () => {
    if (!habit) return;
    
    try {
      await onComplete(habit.id, 0);
      setStep("difficulty");
    } catch (error) {
      console.error("完成习惯失败:", error);
    }
  };

  // 获取挑战级别的样式
  const getTierColors = (level: number) => {
    return {
      1: "border-green-500 bg-green-50 hover:bg-green-100",
      2: "border-amber-500 bg-amber-50 hover:bg-amber-100",
      3: "border-red-500 bg-red-50 hover:bg-red-100",
    }[level] || "border-gray-500 bg-gray-50 hover:bg-gray-100";
  };

  // 获取挑战级别的标签
  const getTierLabel = (level: number) => {
    return {
      1: "初级",
      2: "中级",
      3: "高级",
    }[level] || "其他";
  };

  // 渲染挑战选择内容
  const renderChallengeContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!habitDetail?.challenge_tiers?.length) {
      return (
        <div className="text-center py-6">
          <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p>此习惯暂无挑战级别</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={handleStandardCompletion}
          >
            进行普通打卡
          </Button>
        </div>
      );
    }

    return (
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
          onClick={handleStandardCompletion}
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
    );
  };

  // 渲染难度评估内容
  const renderDifficultyContent = () => {
    return (
      <>
        <p className="text-sm text-muted-foreground mb-4">
          恭喜完成「{habit?.name || ""}」！此次完成感觉如何？评估难度可帮助优化习惯设置。
        </p>

        <div className="flex gap-3 justify-center mt-6">
          <Button
            variant={selectedDifficulty === "easy" ? "default" : "outline"}
            className={`flex-1 ${
              selectedDifficulty === "easy" ? "bg-green-600 hover:bg-green-700" : ""
            }`}
            onClick={() => setSelectedDifficulty("easy")}
          >
            <ThumbsUp className="h-4 w-4 mr-2" />
            简单
          </Button>
          <Button
            variant={selectedDifficulty === "medium" ? "default" : "outline"}
            className={`flex-1 ${
              selectedDifficulty === "medium"
                ? "bg-yellow-600 hover:bg-yellow-700"
                : ""
            }`}
            onClick={() => setSelectedDifficulty("medium")}
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            适中
          </Button>
          <Button
            variant={selectedDifficulty === "hard" ? "default" : "outline"}
            className={`flex-1 ${
              selectedDifficulty === "hard" ? "bg-red-600 hover:bg-red-700" : ""
            }`}
            onClick={() => setSelectedDifficulty("hard")}
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
      </>
    );
  };

  // 渲染对话框内容和底部按钮
  const renderDialogContent = () => {
    if (step === "challenge") {
      return (
        <>
          <DialogHeader>
            <DialogTitle>选择挑战级别</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              为「{habit?.name || ""}」选择一个挑战级别，不同级别将获得不同的奖励点数。
            </p>
            {renderChallengeContent()}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={handleClose}>
              取消
            </Button>
          </DialogFooter>
        </>
      );
    } else {
      return (
        <>
          <DialogHeader>
            <DialogTitle>完成难度评估</DialogTitle>
          </DialogHeader>
          <div className="py-4">{renderDifficultyContent()}</div>
          <DialogFooter>
            <Button variant="ghost" onClick={handleClose}>
              跳过
            </Button>
            <Button
              onClick={handleDifficultySubmit}
              disabled={!selectedDifficulty}
            >
              确认
            </Button>
          </DialogFooter>
        </>
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">{renderDialogContent()}</DialogContent>
    </Dialog>
  );
}