"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import QuickNoteModal from "./QuickNoteModal";

export default function FloatingNoteButton() {
  const [isQuickNoteOpen, setIsQuickNoteOpen] = useState(false);

  const handleRefresh = async () => {
    // 刷新页面上的笔记数据
    // 如果当前路径包含notes，可以考虑刷新笔记列表
    if (window.location.pathname.includes('/notes')) {
      // 实际应用中这里可能需要调用一个事件总线或状态管理来通知笔记列表刷新
      window.location.reload();
    }
  };

  return (
    <>
      <div className="fixed bottom-6 left-6 z-50">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setIsQuickNoteOpen(true)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
              aria-label="添加快速笔记"
            >
              <Plus className="h-6 w-6" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">添加快速笔记</TooltipContent>
        </Tooltip>
      </div>

      <QuickNoteModal
        isOpen={isQuickNoteOpen}
        onClose={() => setIsQuickNoteOpen(false)}
        onSaved={handleRefresh}
      />
    </>
  );
}
