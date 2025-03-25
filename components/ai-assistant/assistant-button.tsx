"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";
import { useAssistant } from "./assistant-provider";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function AssistantButton() {
  const { isEnabled, isOpen, setIsOpen } = useAssistant();
  
  // 如果助手被禁用，不显示按钮
  if (!isEnabled) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-4 right-4 z-50"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="lg"
                className={`rounded-full w-12 h-12 shadow-lg ${
                  isOpen ? "bg-rose-500 hover:bg-rose-600" : "bg-indigo-500 hover:bg-indigo-600"
                }`}
                onClick={() => setIsOpen(!isOpen)}
              >
                {isOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Sparkles className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              {isOpen ? "关闭AI助手" : "打开AI助手"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </motion.div>
    </AnimatePresence>
  );
}
