"use client";

import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { saveDailySummary } from '../dashboard/actions';
import { generateAISummary } from './actions';

// 定义日常总结的数据结构
export interface DailySummaryContext {
  date: string;
  completedTasks: string[];
  completedTodos: string[];
  failedTasks: string[];
  goodThings: string[];
  learnings: string;
  challenges: string;
  improvements: string;
  mood: string;           
  energyLevel: string;    
  sleepQuality: string;   
  tomorrowGoals: string;

  // 时间与专注
  focusTimeMinutes: number;      
  breakCount: number;            
  distractions: string[];        

  // 身体与健康
  stepsCount: number;            
  exerciseMinutes: number;       
  waterIntakeMl: number;         
  mealsQuality: string;          

  // 压力与恢复
  stressLevel: number;           
  mindfulnessMinutes: number;    
  selfCareActivities: string[];  
  
  // 社交与情感
  socialInteractions: string[];  
  gratitudeList: string[];       

  // 效率与满意度
  productivityRating: number;    
}

// 默认的空数据
const defaultSummary: DailySummaryContext = {
  date: new Date().toISOString().split('T')[0],
  completedTasks: [],
  completedTodos: [],
  failedTasks: [],
  goodThings: [],
  learnings: '',
  challenges: '',
  improvements: '',
  mood: '平静',
  energyLevel: '中等',
  sleepQuality: '一般',
  tomorrowGoals: '',
  focusTimeMinutes: 0,
  breakCount: 0,
  distractions: [],
  stepsCount: 0,
  exerciseMinutes: 0,
  waterIntakeMl: 0,
  mealsQuality: '均衡',
  stressLevel: 5,
  mindfulnessMinutes: 0,
  selfCareActivities: [],
  socialInteractions: [],
  gratitudeList: [],
  productivityRating: 5
};

export default function SummaryPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [summary, setSummary] = useState<DailySummaryContext>(defaultSummary);
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleSave = async (data: DailySummaryContext) => {
    const result = await saveDailySummary(data.date, data);
    if (result.success) {
      setSummary(data);
      setIsEditing(false);
    } else {
      // 可以添加错误处理
      console.error("保存失败");
    }
  };

  const handleRequestAiSummary = async () => {
    setIsAiLoading(true);
    setAiError(null);
    
    try {
      const result = await generateAISummary(new Date());
      
      if (result.success) {
        setAiSummary(result.data);
      } else {
        setAiError(result.error || "生成AI总结失败");
      }
    } catch (error) {
      console.error("AI总结请求出错:", error);
      setAiError("请求过程中发生错误");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleApplyAiSuggestions = () => {
    if (!aiSummary) return;
    
    // 这里可以根据AI建议更新表单数据
    const updatedSummary = {
      ...summary,
      // 示例：将AI的建议添加到明日目标中
      tomorrowGoals: summary.tomorrowGoals 
        ? `${summary.tomorrowGoals}\n\nAI建议：${aiSummary.suggestions}` 
        : `AI建议：${aiSummary.suggestions}`
    };
    
    setSummary(updatedSummary);
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6 text-center">每日总结与反思</h1>
      
      {isEditing ? (
        <SummaryForm 
          initialData={summary} 
          onSave={handleSave} 
          onCancel={() => setIsEditing(false)} 
        />
      ) : (
        <>
        <SummaryView 
          data={summary} 
          onEdit={() => setIsEditing(true)} 
        />
         {/* AI总结部分 */}
         <div className="mt-8">
         <Card>
           <CardContent className="pt-6">
             <div className="flex justify-between items-center mb-4">
               <h3 className="text-xl font-semibold">AI智能分析</h3>
               <Button 
                 onClick={handleRequestAiSummary} 
                 disabled={isAiLoading}
                 className="bg-purple-600 hover:bg-purple-700"
               >
                 {isAiLoading ? (
                   <>
                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                     生成中...
                   </>
                 ) : "AI总结"}
               </Button>
             </div>
             
             {aiError && (
               <div className="p-4 bg-red-50 text-red-600 rounded-md mb-4">
                 错误: {aiError}
               </div>
             )}
             
             {isAiLoading ? (
               <div className="flex flex-col items-center justify-center py-10">
                 <Loader2 className="h-10 w-10 animate-spin text-purple-600 mb-4" />
                 <p className="text-gray-500">AI正在分析你的数据，请稍候...</p>
               </div>
             ) : aiSummary ? (
               <div className="space-y-4">
                 <div>
                   <h4 className="font-medium text-gray-700 mb-2">总体概览</h4>
                   <p className="bg-purple-50 p-3 rounded-md">{aiSummary.overview}</p>
                 </div>
                 <div>
                   <h4 className="font-medium text-gray-700 mb-2">见解洞察</h4>
                   <p className="bg-purple-50 p-3 rounded-md">{aiSummary.insights}</p>
                 </div>
                 <div>
                   <h4 className="font-medium text-gray-700 mb-2">改进建议</h4>
                   <p className="bg-purple-50 p-3 rounded-md">{aiSummary.improvements}</p>
                 </div>
                 <div>
                   <h4 className="font-medium text-gray-700 mb-2">明日提示</h4>
                   <p className="bg-purple-50 p-3 rounded-md">{aiSummary.suggestions}</p>
                 </div>
                 
                 <div className="flex justify-end">
                   <Button 
                     onClick={handleApplyAiSuggestions}
                     className="bg-green-500 hover:bg-green-600"
                   >
                     应用AI建议
                   </Button>
                 </div>
               </div>
             ) : (
               <div className="text-center py-10 text-gray-500">
                 点击"AI总结"按钮，让AI为你分析今日数据并提供个性化洞察
               </div>
             )}
           </CardContent>
         </Card>
       </div>
       </>
      )}
    </div>
  );
}

// 总结视图组件
function SummaryView({ data, onEdit }: { data: DailySummaryContext, onEdit: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">{data.date} 总结</h2>
        <Button onClick={onEdit} className="bg-blue-500 hover:bg-blue-600">编辑总结</Button>
      </div>

      {/* 任务与成就 */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-xl font-semibold mb-4">任务与成就</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">已完成任务</h4>
              <ul className="list-disc pl-5 space-y-1">
                {data.completedTasks.length > 0 ? 
                  data.completedTasks.map((task, i) => <li key={i}>{task}</li>) : 
                  <li className="text-gray-400">暂无已完成任务</li>}
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700 mb-2">已完成待办</h4>
              <ul className="list-disc pl-5 space-y-1">
                {data.completedTodos.length > 0 ? 
                  data.completedTodos.map((todo, i) => <li key={i}>{todo}</li>) : 
                  <li className="text-gray-400">暂无已完成待办</li>}
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-gray-700 mb-2">未完成任务</h4>
              <ul className="list-disc pl-5 space-y-1">
                {data.failedTasks.length > 0 ? 
                  data.failedTasks.map((task, i) => <li key={i}>{task}</li>) : 
                  <li className="text-gray-400">暂无未完成任务</li>}
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-700 mb-2">美好事物</h4>
              <ul className="list-disc pl-5 space-y-1">
                {data.goodThings.length > 0 ? 
                  data.goodThings.map((thing, i) => <li key={i}>{thing}</li>) : 
                  <li className="text-gray-400">暂无记录</li>}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 时间与专注 */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-xl font-semibold mb-4">时间与专注</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-blue-600">{data.focusTimeMinutes}</div>
              <div className="text-sm text-gray-600">专注时间(分钟)</div>
            </div>
            <div className="bg-amber-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-amber-600">{data.breakCount}</div>
              <div className="text-sm text-gray-600">休息次数</div>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">主要干扰源</h4>
              <ul className="list-disc pl-5">
                {data.distractions.length > 0 ? 
                  data.distractions.map((item, i) => <li key={i}>{item}</li>) : 
                  <li className="text-gray-400">今天很专注</li>}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 身体与健康 */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-xl font-semibold mb-4">身体与健康</h3>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-green-600">{data.stepsCount}</div>
              <div className="text-sm text-gray-600">步数</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-green-600">{data.exerciseMinutes}</div>
              <div className="text-sm text-gray-600">运动时长(分钟)</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-green-600">{data.waterIntakeMl}</div>
              <div className="text-sm text-gray-600">饮水量(ml)</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-xl font-bold text-green-600">{data.mealsQuality}</div>
              <div className="text-sm text-gray-600">餐饮质量</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 压力与恢复 */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-xl font-semibold mb-4">压力与恢复</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-purple-600">{data.stressLevel}</div>
              <div className="text-sm text-gray-600">压力水平(1-10)</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-purple-600">{data.mindfulnessMinutes}</div>
              <div className="text-sm text-gray-600">正念/冥想(分钟)</div>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">自我关怀活动</h4>
              <ul className="list-disc pl-5">
                {data.selfCareActivities.length > 0 ? 
                  data.selfCareActivities.map((item, i) => <li key={i}>{item}</li>) : 
                  <li className="text-gray-400">今日无自我关怀活动</li>}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 情绪与状态 */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-xl font-semibold mb-4">情绪与状态</h3>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="bg-indigo-50 p-4 rounded-lg text-center">
              <div className="text-xl font-bold text-indigo-600">{data.mood}</div>
              <div className="text-sm text-gray-600">情绪状态</div>
            </div>
            <div className="bg-indigo-50 p-4 rounded-lg text-center">
              <div className="text-xl font-bold text-indigo-600">{data.energyLevel}</div>
              <div className="text-sm text-gray-600">精力水平</div>
            </div>
            <div className="bg-indigo-50 p-4 rounded-lg text-center">
              <div className="text-xl font-bold text-indigo-600">{data.sleepQuality}</div>
              <div className="text-sm text-gray-600">睡眠质量</div>
            </div>
            <div className="bg-indigo-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-indigo-600">{data.productivityRating}</div>
              <div className="text-sm text-gray-600">生产力评分(1-10)</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 社交与情感 */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-xl font-semibold mb-4">社交与情感</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">社交互动</h4>
              <ul className="list-disc pl-5">
                {data.socialInteractions.length > 0 ? 
                  data.socialInteractions.map((item, i) => <li key={i}>{item}</li>) : 
                  <li className="text-gray-400">今日无显著社交互动</li>}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">感恩清单</h4>
              <ul className="list-disc pl-5">
                {data.gratitudeList.length > 0 ? 
                  data.gratitudeList.map((item, i) => <li key={i}>{item}</li>) : 
                  <li className="text-gray-400">暂无记录</li>}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 学习与成长 */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-xl font-semibold mb-4">学习与成长</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">今日学习</h4>
              <p className="bg-gray-50 p-3 rounded-md">{data.learnings || "暂无记录"}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">面临挑战</h4>
              <p className="bg-gray-50 p-3 rounded-md">{data.challenges || "暂无记录"}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">改进空间</h4>
              <p className="bg-gray-50 p-3 rounded-md">{data.improvements || "暂无记录"}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-2">明日目标</h4>
              <p className="bg-gray-50 p-3 rounded-md">{data.tomorrowGoals || "暂无设定"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 总结表单组件
function SummaryForm({ initialData, onSave, onCancel }: { 
  initialData: DailySummaryContext, 
  onSave: (data: DailySummaryContext) => void, 
  onCancel: () => void 
}) {
  const [formData, setFormData] = useState<DailySummaryContext>(initialData);
  
  // 处理文本输入变更
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  // 处理数字输入变更
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: Number(value) }));
  };
  
  // 处理数组输入变更 (例如逗号分隔的列表)
  const handleArrayChange = (e: React.ChangeEvent<HTMLTextAreaElement>, fieldName: string) => {
    const items = e.target.value.split(',').map(item => item.trim()).filter(Boolean);
    setFormData(prev => ({ ...prev, [fieldName]: items }));
  };
  
  // 表单提交处理
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-xl font-semibold mb-4">基本信息</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">日期</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleTextChange}
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-xl font-semibold mb-4">任务与成就</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">已完成任务（逗号分隔）</label>
              <textarea
                value={formData.completedTasks.join(', ')}
                onChange={(e) => handleArrayChange(e, 'completedTasks')}
                className="w-full p-2 border rounded-md min-h-[100px]"
                placeholder="例如：完成报告, 修复bug, 回复邮件"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">已完成待办（逗号分隔）</label>
              <textarea
                value={formData.completedTodos.join(', ')}
                onChange={(e) => handleArrayChange(e, 'completedTodos')}
                className="w-full p-2 border rounded-md min-h-[100px]"
                placeholder="例如：买牛奶, 锻炼30分钟, 整理文档"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">未完成任务（逗号分隔）</label>
              <textarea
                value={formData.failedTasks.join(', ')}
                onChange={(e) => handleArrayChange(e, 'failedTasks')}
                className="w-full p-2 border rounded-md min-h-[100px]"
                placeholder="例如：做周报, 写文档, 整理邮件"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">美好事物（逗号分隔）</label>
              <textarea
                value={formData.goodThings.join(', ')}
                onChange={(e) => handleArrayChange(e, 'goodThings')}
                className="w-full p-2 border rounded-md min-h-[100px]"
                placeholder="例如：遇到好天气, 收到表扬, 发现好吃的店"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-xl font-semibold mb-4">时间与专注</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">专注时长（分钟）</label>
              <input
                type="number"
                name="focusTimeMinutes"
                value={formData.focusTimeMinutes}
                onChange={handleNumberChange}
                className="w-full p-2 border rounded-md"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">休息次数</label>
              <input
                type="number"
                name="breakCount"
                value={formData.breakCount}
                onChange={handleNumberChange}
                className="w-full p-2 border rounded-md"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">干扰源（逗号分隔）</label>
              <textarea
                value={formData.distractions.join(', ')}
                onChange={(e) => handleArrayChange(e, 'distractions')}
                className="w-full p-2 border rounded-md"
                placeholder="例如：社交媒体, 同事打断, 电话"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-xl font-semibold mb-4">身体与健康</h3>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">步数</label>
              <input
                type="number"
                name="stepsCount"
                value={formData.stepsCount}
                onChange={handleNumberChange}
                className="w-full p-2 border rounded-md"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">运动时长（分钟）</label>
              <input
                type="number"
                name="exerciseMinutes"
                value={formData.exerciseMinutes}
                onChange={handleNumberChange}
                className="w-full p-2 border rounded-md"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">饮水量（毫升）</label>
              <input
                type="number"
                name="waterIntakeMl"
                value={formData.waterIntakeMl}
                onChange={handleNumberChange}
                className="w-full p-2 border rounded-md"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">餐饮质量</label>
              <input
                type="text"
                name="mealsQuality"
                value={formData.mealsQuality}
                onChange={handleTextChange}
                className="w-full p-2 border rounded-md"
                placeholder="例如：均衡、偏油腻、高蛋白"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-xl font-semibold mb-4">压力与恢复</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">压力水平（1-10）</label>
              <input
                type="number"
                name="stressLevel"
                value={formData.stressLevel}
                onChange={handleNumberChange}
                className="w-full p-2 border rounded-md"
                min="1"
                max="10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">正念/冥想时长（分钟）</label>
              <input
                type="number"
                name="mindfulnessMinutes"
                value={formData.mindfulnessMinutes}
                onChange={handleNumberChange}
                className="w-full p-2 border rounded-md"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">自我关怀活动（逗号分隔）</label>
              <textarea
                value={formData.selfCareActivities.join(', ')}
                onChange={(e) => handleArrayChange(e, 'selfCareActivities')}
                className="w-full p-2 border rounded-md"
                placeholder="例如：泡澡, 阅读, 听音乐"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-xl font-semibold mb-4">情绪与状态</h3>
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">情绪状态</label>
              <input
                type="text"
                name="mood"
                value={formData.mood}
                onChange={handleTextChange}
                className="w-full p-2 border rounded-md"
                placeholder="例如：愉快、平静、焦虑"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">精力水平</label>
              <input
                type="text"
                name="energyLevel"
                value={formData.energyLevel}
                onChange={handleTextChange}
                className="w-full p-2 border rounded-md"
                placeholder="例如：充沛、中等、疲惫"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">睡眠质量</label>
              <input
                type="text"
                name="sleepQuality"
                value={formData.sleepQuality}
                onChange={handleTextChange}
                className="w-full p-2 border rounded-md"
                placeholder="例如：良好、一般、差"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">生产力评分（1-10）</label>
              <input
                type="number"
                name="productivityRating"
                value={formData.productivityRating}
                onChange={handleNumberChange}
                className="w-full p-2 border rounded-md"
                min="1"
                max="10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-xl font-semibold mb-4">社交与情感</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">社交互动（逗号分隔）</label>
              <textarea
                value={formData.socialInteractions.join(', ')}
                onChange={(e) => handleArrayChange(e, 'socialInteractions')}
                className="w-full p-2 border rounded-md min-h-[100px]"
                placeholder="例如：与朋友聚餐, 与同事合作, 与客户会面"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">感恩清单（逗号分隔）</label>
              <textarea
                value={formData.gratitudeList.join(', ')}
                onChange={(e) => handleArrayChange(e, 'gratitudeList')}
                className="w-full p-2 border rounded-md min-h-[100px]"
                placeholder="例如：家人的支持, 同事的帮助, 今天的好天气"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-xl font-semibold mb-4">学习与成长</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">今日学习</label>
              <textarea
                name="learnings"
                value={formData.learnings}
                onChange={handleTextChange}
                className="w-full p-2 border rounded-md min-h-[100px]"
                placeholder="今天我学到了..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">面临挑战</label>
              <textarea
                name="challenges"
                value={formData.challenges}
                onChange={handleTextChange}
                className="w-full p-2 border rounded-md min-h-[100px]"
                placeholder="我今天遇到的挑战是..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">改进空间</label>
              <textarea
                name="improvements"
                value={formData.improvements}
                onChange={handleTextChange}
                className="w-full p-2 border rounded-md min-h-[100px]"
                placeholder="我可以改进的地方是..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">明日目标</label>
              <textarea
                name="tomorrowGoals"
                value={formData.tomorrowGoals}
                onChange={handleTextChange}
                className="w-full p-2 border rounded-md min-h-[100px]"
                placeholder="明天我计划..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={onCancel}>取消</Button>
        <Button type="submit" className="bg-green-500 hover:bg-green-600">保存总结</Button>
      </div>
    </form>
  );
}
