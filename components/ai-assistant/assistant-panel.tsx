"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, 
  Tag, 
  MessageSquare, 
  Settings, 
  Clock, 
  Sparkles, 
  CalendarCheck2 
} from "lucide-react";
import { useAssistant } from "./assistant-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ASSISTANT_CONFIG } from "@/lib/langchain";

export function AssistantPanel() {
  const { 
    isEnabled, 
    isOpen, 
    setIsOpen, 
    activeFeature, 
    setActiveFeature, 
    features, 
    toggleFeature,
    suggestions 
  } = useAssistant();
  const [activeTab, setActiveTab] = useState("suggestions");
  
  // 如果助手被禁用或面板关闭，不渲染
  if (!isEnabled || !isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-20 right-4 z-40 w-80 md:w-96 bg-background rounded-lg shadow-lg overflow-hidden border"
        initial={{ y: 20, opacity: 0, height: 0 }}
        animate={{ y: 0, opacity: 1, height: "auto" }}
        exit={{ y: 20, opacity: 0, height: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-indigo-500" />
              <h2 className="text-lg font-semibold">{ASSISTANT_CONFIG.name}</h2>
            </div>
            <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              AI
            </Badge>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="suggestions">建议</TabsTrigger>
              <TabsTrigger value="features">功能</TabsTrigger>
              <TabsTrigger value="settings">设置</TabsTrigger>
            </TabsList>
            
            <TabsContent value="suggestions" className="space-y-4">
              {Object.keys(suggestions).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mb-2 opacity-20" />
                  <p>暂无建议</p>
                  <p className="text-xs max-w-[250px] mt-1">使用应用的各项功能后，AI助手将在这里提供个性化建议</p>
                </div>
              ) : (
                <>
                  {suggestions.summaryFeedback && (
                    <SuggestionCard 
                      title="日记总结反馈"
                      description="基于你的昨日总结"
                      icon={<CalendarCheck2 className="h-4 w-4 text-green-500" />}
                    >
                      <p className="text-sm">{suggestions.summaryFeedback}</p>
                    </SuggestionCard>
                  )}
                  
                  {suggestions.tagSuggestions && (
                    <SuggestionCard 
                      title="标签建议"
                      description="为你的任务推荐"
                      icon={<Tag className="h-4 w-4 text-blue-500" />}
                    >
                      <div className="flex flex-wrap gap-1 mt-2">
                        {suggestions.tagSuggestions.tags.map((tag: string, i: number) => (
                          <Badge key={i} variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </SuggestionCard>
                  )}
                  
                  {suggestions.dailyPlanning && (
                    <SuggestionCard 
                      title="今日规划"
                      description="基于你的任务和习惯"
                      icon={<Clock className="h-4 w-4 text-purple-500" />}
                    >
                      <div className="space-y-2 mt-2">
                        {suggestions.dailyPlanning.schedule.slice(0, 3).map((item: any, i: number) => (
                          <div key={i} className="flex text-sm">
                            <span className="font-medium min-w-[80px]">{item.time}</span>
                            <span>{item.activity}</span>
                          </div>
                        ))}
                        {suggestions.dailyPlanning.schedule.length > 3 && (
                          <Button variant="link" className="text-xs p-0 h-auto" onClick={() => setActiveFeature('dailyPlanning')}>
                            查看完整规划
                          </Button>
                        )}
                      </div>
                    </SuggestionCard>
                  )}
                  
                  {suggestions.habitSuggestions && (
                    <SuggestionCard 
                      title="习惯建议"
                      description="提升你的习惯养成"
                      icon={<Calendar className="h-4 w-4 text-amber-500" />}
                    >
                      <p className="text-sm">{suggestions.habitSuggestions.currentHabitsSuggestions}</p>
                      {suggestions.habitSuggestions.newHabitsSuggestions && (
                        <>
                          <Separator className="my-2" />
                          <p className="text-sm">
                            <span className="font-medium">新习惯建议: </span>
                            {suggestions.habitSuggestions.newHabitsSuggestions}
                          </p>
                        </>
                      )}
                    </SuggestionCard>
                  )}
                </>
              )}
            </TabsContent>
            
            <TabsContent value="features" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">可用功能</CardTitle>
                  <CardDescription>选择你想要开启的AI助手功能</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="summary-feedback">总结反馈</Label>
                      <p className="text-xs text-muted-foreground">
                        基于你的日记总结提供反馈和建议
                      </p>
                    </div>
                    <Switch
                      id="summary-feedback"
                      checked={features.summarizeFeedback}
                      onCheckedChange={() => toggleFeature('summarizeFeedback')}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="tag-suggestion">标签建议</Label>
                      <p className="text-xs text-muted-foreground">
                        自动为任务和番茄钟提供标签建议
                      </p>
                    </div>
                    <Switch
                      id="tag-suggestion"
                      checked={features.tagSuggestion}
                      onCheckedChange={() => toggleFeature('tagSuggestion')}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="daily-planning">日程规划</Label>
                      <p className="text-xs text-muted-foreground">
                        根据你的任务和习惯自动规划每日安排
                      </p>
                    </div>
                    <Switch
                      id="daily-planning"
                      checked={features.dailyPlanning}
                      onCheckedChange={() => toggleFeature('dailyPlanning')}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="habit-suggestion">习惯建议</Label>
                      <p className="text-xs text-muted-foreground">
                        提供习惯养成的建议和改进方案
                      </p>
                    </div>
                    <Switch
                      id="habit-suggestion"
                      checked={features.habitSuggestion}
                      onCheckedChange={() => toggleFeature('habitSuggestion')}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">AI助手设置</CardTitle>
                  <CardDescription>配置AI助手的行为和偏好</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="enable-assistant">启用AI助手</Label>
                      <p className="text-xs text-muted-foreground">
                        是否在应用中显示AI助手
                      </p>
                    </div>
                    <Switch
                      id="enable-assistant"
                      checked={isEnabled}
                      onCheckedChange={(checked) => {
                        if (!checked) setIsOpen(false);
                        useAssistant().setIsEnabled(checked);
                      }}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-1">
                    <Label>数据隐私</Label>
                    <p className="text-xs text-muted-foreground">
                      AI助手仅使用你在应用中已有的数据，不会外泄个人信息，所有数据处理在服务器端完成。
                    </p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full" 
                    onClick={() => useAssistant().clearSuggestions()}
                  >
                    清除所有建议
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// 建议卡片组件
function SuggestionCard({ 
  title, 
  description, 
  icon, 
  children 
}: { 
  title: string; 
  description: string; 
  icon: React.ReactNode; 
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {icon}
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
          </div>
          <CardDescription className="text-xs">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}
