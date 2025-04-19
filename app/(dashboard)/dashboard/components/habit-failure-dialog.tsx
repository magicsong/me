"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lightbulb, XCircle, BookOpen } from "lucide-react";
import { HabitBO } from "@/app/api/types";

// 类型定义
type FailureReason = 
  | "时间管理问题" 
  | "精力不足" 
  | "外部干扰" 
  | "目标设置不合理" 
  | "忘记了" 
  | "身体不适" 
  | "其他";

type HabitFailureDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  habit: HabitBO | null;
  onSubmit: (data: {
    habitId: number;
    failureReason: FailureReason;
    comment: string;
    status: 'failed';
  }) => void;
};

export function HabitFailureDialog({
  isOpen,
  onClose,
  habit,
  onSubmit,
}: HabitFailureDialogProps) {
  // 状态管理
  const [submitting, setSubmitting] = useState(false);
  const [selectedReason, setSelectedReason] = useState<FailureReason>("时间管理问题");
  const [comment, setComment] = useState("");
  const [showTip, setShowTip] = useState(true);
  
  // 当对话框开启时重置状态
  useEffect(() => {
    if (isOpen) {
      setSelectedReason("时间管理问题");
      setComment("");
      setSubmitting(false);
      setShowTip(true);
    }
  }, [isOpen]);

  // 处理关闭对话框
  const handleClose = () => {
    setSelectedReason("时间管理问题");
    setComment("");
    onClose();
  };

  // 处理提交
  const handleSubmit = async () => {
    if (!habit) return;
    
    try {
      setSubmitting(true);
      
      await onSubmit({
        habitId: habit.id,
        failureReason: selectedReason,
        comment,
        status: 'failed'
      });
      
      handleClose();
    } catch (error) {
      console.error("提交习惯失败记录失败:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // 渲染鼓励小贴士
  const renderEncouragementTip = () => {
    // 根据不同的失败原因提供针对性建议
    const tips = {
      "时间管理问题": "尝试使用番茄工作法或时间块技术，为习惯预留固定时间段。",
      "精力不足": "考虑调整习惯执行的时间，选择你精力最充沛的时段。",
      "外部干扰": "创建一个无干扰环境，或告诉他人你需要专注时间。",
      "目标设置不合理": "考虑将大目标分解为更小、更易实现的步骤。",
      "忘记了": "设置提醒或将习惯与已有的日常活动绑定。",
      "身体不适": "健康最重要，休息好后再继续。适当调整习惯难度。",
      "其他": "分析具体原因，寻找适合你的解决方案。"
    };
    
    return (
      <div className="bg-blue-50 p-4 rounded-lg mt-4 animate-fadeIn relative">
        <Button 
          variant="ghost" 
          size="icon"
          className="absolute top-1 right-1 h-6 w-6 text-gray-400 hover:text-gray-600"
          onClick={() => setShowTip(false)}
        >
          <XCircle className="h-4 w-4" />
        </Button>
        <div className="flex gap-3 items-start">
          <Lightbulb className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-sm text-blue-800">学习与成长</h4>
            <p className="text-sm text-blue-700 mt-1">
              {tips[selectedReason] || tips["其他"]}
            </p>
            <p className="text-xs text-blue-600 mt-2 italic">
              每次失败都是找到更好方法的机会。
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-amber-500" />
            记录「{habit?.name || ""}」未完成
          </DialogTitle>
          <DialogDescription>
            诚实记录可以帮助你了解习惯养成的障碍，找出改进方法
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-5">
          {/* 失败原因选择 */}
          <div className="space-y-2">
            <Label htmlFor="failure-reason">
              未能完成的原因
            </Label>
            <Select 
              value={selectedReason} 
              onValueChange={(value) => setSelectedReason(value as FailureReason)}
            >
              <SelectTrigger id="failure-reason">
                <SelectValue placeholder="选择失败原因" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="时间管理问题">时间管理问题</SelectItem>
                <SelectItem value="精力不足">精力不足</SelectItem>
                <SelectItem value="外部干扰">外部干扰</SelectItem>
                <SelectItem value="目标设置不合理">目标设置不合理</SelectItem>
                <SelectItem value="忘记了">忘记了</SelectItem>
                <SelectItem value="身体不适">身体不适</SelectItem>
                <SelectItem value="其他">其他原因</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* 详细说明 */}
          <div className="space-y-2">
            <Label htmlFor="comment">
              补充说明（可选）
            </Label>
            <Textarea
              id="comment"
              placeholder="添加更多细节，帮助自己分析问题..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>
          
          {/* 鼓励提示 */}
          {showTip && renderEncouragementTip()}
          
          {/* 成长心态提示 */}
          <div className="flex items-center gap-2 mt-2 border-t pt-4">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            <p className="text-xs text-muted-foreground italic">
              记录失败不是为了自责，而是为了学习和成长。
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={submitting}>
            取消
          </Button>
          <Button
            variant="default"
            onClick={handleSubmit}
            disabled={!selectedReason || submitting}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {submitting ? "提交中..." : "记录并学习"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}