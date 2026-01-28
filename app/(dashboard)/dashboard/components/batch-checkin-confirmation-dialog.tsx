"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle } from "lucide-react";

type BatchCheckInConfirmationDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  count: number;
  dateLabel: string;
  isLoading?: boolean;
};

export function BatchCheckInConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  count,
  dateLabel,
  isLoading = false,
}: BatchCheckInConfirmationDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            确认批量打卡
          </DialogTitle>
          <DialogDescription>
            确认要为{dateLabel}的 <span className="font-semibold text-foreground">{count}</span> 个习惯打卡吗？
          </DialogDescription>
        </DialogHeader>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="text-sm text-blue-800">
            💡 打卡后，所有选中的习惯将被标记为完成。如有挑战，将完成激活的挑战。
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            取消
          </Button>
          <Button
            variant="default"
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? "处理中..." : "确认打卡"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
