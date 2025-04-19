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
import { HabitBO } from "@/app/api/types";
import { ChallengeTier } from "@/app/api/types/habit";

// 类型定义
type DifficultyLevel = "easy" | "medium" | "hard" | null;

// 修改组件 props，添加标记失败的功能
type HabitCompletionDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  habit: HabitBO | null;
  onSubmit: (data: {
    habitId: number;
    tierId?: number;
    difficulty: DifficultyLevel;
    comment: string;
    status: 'completed' | 'failed'; // 添加状态字段
    failureReason?: string; // 添加失败原因字段
  }) => void;
};

export function HabitCompletionDialog({
  isOpen,
  onClose,
  habit,
  onSubmit,
}: HabitCompletionDialogProps) {
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [habitDetail, setHabitDetail] = useState<any>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>(null);
  const [comment, setComment] = useState("");
  const [selectedTierId, setSelectedTierId] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<'completed' | 'failed'>('completed'); // 默认为完成状态
  const [failureReason, setFailureReason] = useState('');

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
      setSelectedDifficulty(null);
      setComment("");
      setSelectedTierId(undefined);
      setSubmitting(false);
    }
  }, [isOpen]);

  // 处理选择挑战级别
  const handleTierSelect = (tierId: number) => {
    setSelectedTierId(tierId);
  };

  // 处理普通完成
  const handleStandardCompletion = () => {
    setSelectedTierId(0); // 0表示普通完成
  };

  // 处理关闭对话框
  const handleClose = () => {
    setSelectedDifficulty(null);
    setComment("");
    setSelectedTierId(undefined);
    onClose();
  };
  
  function resetForm() {
    setSelectedDifficulty(null);
    setSelectedTierId(undefined);
    setComment('');
    setStatus('completed');
    setFailureReason('');
  }
  // 处理提交
  const handleSubmit = async () => {
    if (!habit || !selectedDifficulty) return;
    
    try {
      setSubmitting(true);
      
      // 调用合并后的提交函数
      await onSubmit({
        habitId: habit.id,
        tierId: selectedTierId,
        difficulty: selectedDifficulty,
        comment,
        status,
      failureReason: status === 'failed' ? failureReason : undefined
      });
      
      handleClose();
    } catch (error) {
      console.error("提交习惯完成失败:", error);
    } finally {
      setSubmitting(false);
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

  // 渲染对话框内容和底部按钮
  const renderDialogContent = () => {
    return (
      <>
        <DialogHeader>
          <DialogTitle>完成习惯「{habit?.name || ""}」</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-6">
          {/* 挑战级别部分 */}
          <div className="space-y-2">
            <h3 className="font-medium">1. 选择挑战级别</h3>
            <p className="text-sm text-muted-foreground mb-2">
              选择一个挑战级别，不同级别将获得不同的奖励点数。
            </p>
            {loading ? (
              <div className="flex justify-center p-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : !habitDetail?.challenge_tiers?.length ? (
              <div className="text-center py-4 bg-gray-50 rounded-md">
                <Trophy className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm">此习惯暂无挑战级别，将进行普通打卡</p>
                {selectedTierId === undefined && handleStandardCompletion()}
              </div>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {habitDetail.challenge_tiers.map((tier: ChallengeTier) => {
                  const tierColors = getTierColors(tier.level);
                  const isSelected = selectedTierId === tier.id;
                  
                  return (
                    <div
                      key={tier.id}
                      className={`border-l-4 p-2 rounded-md ${tierColors} cursor-pointer transition-all duration-200 ${
                        isSelected ? 'ring-2 ring-primary ring-offset-1' : ''
                      }`}
                      onClick={() => handleTierSelect(tier.id)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium flex items-center gap-2 text-sm">
                            {tier.name}
                            <Badge>{getTierLabel(tier.level)}</Badge>
                            {isSelected && <Badge variant="default">已选择</Badge>}
                          </h4>
                          {tier.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {tier.description}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-amber-600">
                          +{tier.reward_points} 奖励
                        </Badge>
                      </div>
                    </div>
                  );
                })}
                
                <div
                  className={`border p-2 rounded-md bg-gray-50 hover:bg-gray-100 cursor-pointer transition-all duration-200 ${
                    selectedTierId === 0 ? 'ring-2 ring-primary ring-offset-1' : ''
                  }`}
                  onClick={handleStandardCompletion}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium text-sm">普通完成</h4>
                      <p className="text-xs text-muted-foreground">
                        不选择挑战级别，获得标准奖励
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedTierId === 0 && <Badge variant="default">已选择</Badge>}
                      <Badge variant="outline">
                        +{habit?.rewardPoints || 10} 奖励
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* 难度评估部分 */}
          <div className="border-t pt-4 space-y-2">
            <h3 className="font-medium">2. 完成难度评估</h3>
            <p className="text-sm text-muted-foreground mb-2">
              评估此次完成的难度，这将帮助优化习惯设置。
            </p>
            
            <div className="flex gap-3 justify-center mt-4">
              <Button
                variant={selectedDifficulty === "easy" ? "default" : "outline"}
                className={`flex-1 ${
                  selectedDifficulty === "easy" ? "bg-green-600 hover:bg-green-700" : ""
                }`}
                onClick={() => setSelectedDifficulty("easy")}
              >
                <ThumbsUp className="h-4 w-4 mr-1" />
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
                <AlertCircle className="h-4 w-4 mr-1" />
                适中
              </Button>
              <Button
                variant={selectedDifficulty === "hard" ? "default" : "outline"}
                className={`flex-1 ${
                  selectedDifficulty === "hard" ? "bg-red-600 hover:bg-red-700" : ""
                }`}
                onClick={() => setSelectedDifficulty("hard")}
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                困难
              </Button>
            </div>
            
            <div className="mt-4">
              <label className="text-sm text-muted-foreground mb-1 block">
                评价（可选）
              </label>
              <Textarea
                placeholder="写下你对这次完成的感受或想法..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="resize-none"
                rows={2}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={submitting}>
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedTierId === undefined || !selectedDifficulty || submitting}
          >
            {submitting ? "提交中..." : "确认完成"}
          </Button>
        </DialogFooter>
      </>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">{renderDialogContent()}</DialogContent>
    </Dialog>
  );
}