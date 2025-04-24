"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Book, CheckSquare, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import QuickNoteModal from "./QuickNoteModal";
import { motion, AnimatePresence } from "framer-motion";
import QuickTodoModal from "../QuickTodoModal";

export default function FloatingNoteButton() {
  const [isQuickNoteOpen, setIsQuickNoteOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isQuickTodoOpen, setIsQuickTodoOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleRefresh = async () => {
    // 刷新页面上的笔记数据
    // 如果当前路径包含notes，可以考虑刷新笔记列表
    if (window.location.pathname.includes('/notes')) {
      // 实际应用中这里可能需要调用一个事件总线或状态管理来通知笔记列表刷新
      window.location.reload();
    }
  };

  // 点击外部关闭菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // 菜单项的变体配置
  const menuItemVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 20 },
    visible: (index: number) => ({
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        delay: index * 0.1,
        duration: 0.3,
        type: "spring",
        stiffness: 300,
        damping: 15
      }
    }),
    exit: { 
      opacity: 0, 
      scale: 0.8, 
      y: 10,
      transition: { duration: 0.2 } 
    }
  };

  // 主菜单按钮的变体配置
  const mainButtonVariants = {
    initial: { scale: 1 },
    tap: { scale: 0.9 },
    hover: { scale: 1.1 }
  };

  return (
    <>
      <div className="fixed bottom-6 left-6 z-50" ref={menuRef}>
        <AnimatePresence>
          {isMenuOpen && (
            <div className="absolute bottom-16 left-0 flex flex-col gap-3 mb-2">
              <motion.div
                initial="hidden"
                animate="visible"
                exit="exit"
                custom={0}
                variants={menuItemVariants}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        setIsQuickNoteOpen(true);
                        setIsMenuOpen(false);
                      }}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white shadow-lg hover:bg-green-600 transition-colors focus:outline-none focus:ring-2"
                      aria-label="添加快速笔记"
                    >
                      <Book className="h-5 w-5" />
                    </motion.button>
                  </TooltipTrigger>
                  <TooltipContent side="right">添加快速笔记</TooltipContent>
                </Tooltip>
              </motion.div>
              
              <motion.div
                initial="hidden"
                animate="visible"
                exit="exit"
                custom={1}
                variants={menuItemVariants}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        setIsQuickTodoOpen(true);
                        setIsMenuOpen(false);
                      }}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500 text-white shadow-lg hover:bg-purple-600 transition-colors focus:outline-none focus:ring-2"
                      aria-label="添加快速待办"
                    >
                      <CheckSquare className="h-5 w-5" />
                    </motion.button>
                  </TooltipTrigger>
                  <TooltipContent side="right">添加快速待办</TooltipContent>
                </Tooltip>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              variants={mainButtonVariants}
              initial="initial"
              whileHover="hover"
              whileTap="tap"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`flex h-12 w-12 items-center justify-center rounded-full ${isMenuOpen ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} text-white shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2`}
              aria-label={isMenuOpen ? "关闭菜单" : "打开快捷菜单"}
              animate={{
                rotate: isMenuOpen ? 180 : 0,
                transition: { duration: 0.3 }
              }}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {isMenuOpen ? "关闭菜单" : "打开快捷菜单"}
          </TooltipContent>
        </Tooltip>
      </div>

      <QuickNoteModal
        isOpen={isQuickNoteOpen}
        onClose={() => setIsQuickNoteOpen(false)}
        onSaved={handleRefresh}
      />
      
      <QuickTodoModal
        isOpen={isQuickTodoOpen}
        onClose={() => setIsQuickTodoOpen(false)}
        onSaved={handleRefresh}
      />
    </>
  );
}