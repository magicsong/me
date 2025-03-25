"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { ASSISTANT_CONFIG } from "@/lib/langchain";
import { useToast } from "@/components/hooks/use-toast";

// Custom hook for localStorage persistence
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}

interface AssistantState {
  isEnabled: boolean;
  setIsEnabled: (enabled: boolean) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeFeature: string | null;
  setActiveFeature: (feature: string | null) => void;
  features: Record<string, boolean>;
  toggleFeature: (feature: string) => void;
  suggestions: Record<string, any>;
  setSuggestion: (key: string, data: any) => void;
  clearSuggestions: () => void;
}

const AssistantContext = createContext<AssistantState | undefined>(undefined);

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  // 从本地存储加载助手状态
  const [isEnabled, setIsEnabled] = useLocalStorage(
    "ai-assistant-enabled", 
    ASSISTANT_CONFIG.enabledByDefault
  );
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [features, setFeatures] = useLocalStorage("ai-assistant-features", ASSISTANT_CONFIG.features);
  const [suggestions, setSuggestions] = useState<Record<string, any>>({});
  const { toast } = useToast();
  
  // 切换功能开关
  const toggleFeature = (feature: string) => {
    setFeatures(prev => ({
      ...prev,
      [feature]: !prev[feature]
    }));
  };
  
  // 设置建议
  const setSuggestion = (key: string, data: any) => {
    setSuggestions(prev => ({
      ...prev,
      [key]: data
    }));
  };
  
  // 清除所有建议
  const clearSuggestions = () => {
    setSuggestions({});
  };
  
  // 监听助手状态变化
  useEffect(() => {
    if (isEnabled) {
      console.log("AI助手已启用");
    } else {
      console.log("AI助手已禁用");
      setIsOpen(false);
    }
  }, [isEnabled]);
  
  // 提供上下文值
  const contextValue: AssistantState = {
    isEnabled,
    setIsEnabled,
    isOpen,
    setIsOpen,
    activeFeature,
    setActiveFeature,
    features,
    toggleFeature,
    suggestions,
    setSuggestion,
    clearSuggestions
  };
  
  return (
    <AssistantContext.Provider value={contextValue}>
      {children}
    </AssistantContext.Provider>
  );
}

// 使用助手的Hook
export function useAssistant() {
  const context = useContext(AssistantContext);
  if (context === undefined) {
    throw new Error("useAssistant must be used within an AssistantProvider");
  }
  return context;
}
