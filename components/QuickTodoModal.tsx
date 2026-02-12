"use client";

import { createTodo } from '@/app/(dashboard)/habits/client-actions';
import { TodoBO } from "@/app/api/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from 'react';
import { toast } from "sonner";
import { BrainIcon, Loader2, XIcon } from "lucide-react";
import { fetchTags } from '@/app/(dashboard)/actions';
import { TagCategorySelector, RequiredTagsSelection } from '@/components/tag-selection';

interface QuickTodoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved?: () => void;
}

interface Tag {
  id: number;
  name: string;
  color: string;
  category?: 'decision_type' | 'domain_type' | 'work_nature';
}

export default function QuickTodoModal({ isOpen, onClose, onSaved }: any) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mode, setMode] = useState<'form' | 'ai-split'>('form');
    const [showRequiredTagsModal, setShowRequiredTagsModal] = useState(false);
    
    // 表单字段
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('medium');
    const [isLargeTask, setIsLargeTask] = useState(false);
    const [availableTags, setAvailableTags] = useState<Tag[]>([]);
    const [isLoadingTags, setIsLoadingTags] = useState(true);
    
    // 必选标签分类选择
    const [selectedDecisionTypeTagId, setSelectedDecisionTypeTagId] = useState<number | null>(null);
    const [selectedDomainTypeTagId, setSelectedDomainTypeTagId] = useState<number | null>(null);
    const [selectedWorkNatureTagId, setSelectedWorkNatureTagId] = useState<number | null>(null);

    // AI拆解相关
    const [aiSplitPrompt, setAiSplitPrompt] = useState('');
    const [isGeneratingSubTasks, setIsGeneratingSubTasks] = useState(false);
    const [generatedSubTasks, setGeneratedSubTasks] = useState<Array<{ title: string; description?: string }>>([]);

    // 加载标签
    useEffect(() => {
        const loadTags = async () => {
            try {
                setIsLoadingTags(true);
                const response = await fetchTags("todo");
                if (response.success && response.data) {
                    setAvailableTags(response.data as Tag[]);
                }
            } catch (error) {
                console.error('获取标签失败:', error);
            } finally {
                setIsLoadingTags(false);
            }
        };

        if (isOpen) {
            loadTags();
        }
    }, [isOpen]);

    // 检查是否已选择所有必填标签分类
    const checkRequiredTags = () => {
        return selectedDecisionTypeTagId !== null && 
               selectedDomainTypeTagId !== null && 
               selectedWorkNatureTagId !== null;
    };

    const getSelectedTagIds = () => {
        const ids: number[] = [];
        if (selectedDecisionTypeTagId) ids.push(selectedDecisionTypeTagId);
        if (selectedDomainTypeTagId) ids.push(selectedDomainTypeTagId);
        if (selectedWorkNatureTagId) ids.push(selectedWorkNatureTagId);
        return ids;
    };

    const handleRequiredTagsConfirm = (tagIds: number[]) => {
        const decisionTag = tagIds.find(id => 
            availableTags.find(t => t.id === id && t.category === 'decision_type')
        );
        const domainTag = tagIds.find(id => 
            availableTags.find(t => t.id === id && t.category === 'domain_type')
        );
        const workTag = tagIds.find(id => 
            availableTags.find(t => t.id === id && t.category === 'work_nature')
        );

        setSelectedDecisionTypeTagId(decisionTag || null);
        setSelectedDomainTypeTagId(domainTag || null);
        setSelectedWorkNatureTagId(workTag || null);
        setShowRequiredTagsModal(false);
    };

    const generateSubTasks = async () => {
        if (!title.trim()) {
            toast.error('请先输入任务标题');
            return;
        }

        setIsGeneratingSubTasks(true);
        try {
            const response = await fetch(`/api/todo/ai-split`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    parentId: 0,
                    title: title,
                    description: description,
                    priority: priority,
                    userPrompt: aiSplitPrompt,
                }),
            });

            if (!response.ok) {
                throw new Error('AI拆分任务失败');
            }

            const data = await response.json();
            if (data.success && data.data) {
                setGeneratedSubTasks(data.data);
                toast.success(`成功拆解为${data.data.length}个子任务`);
            } else {
                throw new Error(data.error || '拆分失败');
            }
        } catch (error) {
            console.error('AI拆分任务失败:', error);
            toast.error('AI拆分任务失败，请重试');
        } finally {
            setIsGeneratingSubTasks(false);
        }
    };

    const handleEditSubTask = (index: number, field: 'title' | 'description', value: string) => {
        const newSubTasks = [...generatedSubTasks];
        if (field === 'title') {
            newSubTasks[index].title = value;
        } else {
            newSubTasks[index].description = value;
        }
        setGeneratedSubTasks(newSubTasks);
    };

    const handleRemoveSubTask = (index: number) => {
        setGeneratedSubTasks(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmitForm = async (
        data: any,
        tagIds: number[]
    ) => {
        try {
            setIsSubmitting(true);

            const response = await createTodo({
                ...data,
                isLargeTask: isLargeTask,
                tagIds: tagIds,
            });

            if (!response) {
                throw new Error("添加待办事项失败");
            }
            toast.success("待办事项已添加");
            
            // 如果有子任务，创建子任务
            if (generatedSubTasks.length > 0 && response.id) {
                const createPromises = generatedSubTasks.map(subTask =>
                    fetch('/api/todo', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            data: {
                                title: subTask.title,
                                description: subTask.description,
                                parentId: response.id,
                                priority: priority,
                                status: 'pending'
                            }
                        })
                    })
                );

                const results = await Promise.all(createPromises);
                const allSuccess = results.every(r => r.ok);
                
                if (allSuccess) {
                    toast.success(`子任务已创建`);
                }
            }

            resetForm();
            onClose();

            if (onSaved) {
                onSaved();
            }
        } catch (error) {
            console.error("添加待办事项出错:", error);
            toast.error("添加待办事项失败，请重试");
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setPriority('medium');
        setIsLargeTask(false);
        setSelectedDecisionTypeTagId(null);
        setSelectedDomainTypeTagId(null);
        setSelectedWorkNatureTagId(null);
        setAiSplitPrompt('');
        setGeneratedSubTasks([]);
        setMode('form');
    };

    return (
        <>
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) {
                resetForm();
                onClose();
            }
        }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        <div className="flex items-center justify-between w-full">
                            <span>快速添加待办事项</span>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant={mode === 'form' ? 'default' : 'outline'}
                                    onClick={() => setMode('form')}
                                >
                                    普通模式
                                </Button>
                                <Button
                                    size="sm"
                                    variant={mode === 'ai-split' ? 'default' : 'outline'}
                                    className={mode === 'ai-split' ? 'bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600' : ''}
                                    onClick={() => setMode('ai-split')}
                                >
                                    <BrainIcon className="h-4 w-4 mr-1" />
                                    AI拆解
                                </Button>
                            </div>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    {mode === 'form' ? (
                        <div className="space-y-6">
                            {/* 基本信息 */}
                            <div className="space-y-3">
                                <div>
                                    <div className="text-sm font-medium mb-1">任务标题</div>
                                    <Input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="输入任务标题"
                                        className="mt-1"
                                    />
                                </div>

                                <div>
                                    <div className="text-sm font-medium mb-1">任务描述</div>
                                    <Textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="输入任务描述（可选）"
                                        className="mt-1"
                                        rows={3}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-sm font-medium mb-1">优先级</div>
                                        {/* @ts-ignore */}
                                        <Select value={priority} onValueChange={setPriority}>
                                            {/* @ts-ignore */}
                                            <SelectTrigger className="mt-1">
                                                {/* @ts-ignore */}
                                                <SelectValue />
                                            </SelectTrigger>
                                            {/* @ts-ignore */}
                                            <SelectContent>
                                                {/* @ts-ignore */}
                                                <SelectItem value="urgent">紧急</SelectItem>
                                                {/* @ts-ignore */}
                                                <SelectItem value="high">高</SelectItem>
                                                {/* @ts-ignore */}
                                                <SelectItem value="medium">中</SelectItem>
                                                {/* @ts-ignore */}
                                                <SelectItem value="low">低</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex items-end">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="large-task"
                                                checked={isLargeTask}
                                                onCheckedChange={(checked: any) => setIsLargeTask(checked as boolean)}
                                            />
                                            <label htmlFor="large-task" className="text-sm font-medium cursor-pointer">
                                                大型任务（需要拆解）
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 必选标签分类 */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm font-medium block">选择必填标签</div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setShowRequiredTagsModal(true)}
                                    >
                                        {checkRequiredTags() ? '已选择' : '选择标签'}
                                    </Button>
                                </div>

                                {/* 显示已选择的标签 */}
                                {checkRequiredTags() && (
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {[selectedDecisionTypeTagId, selectedDomainTypeTagId, selectedWorkNatureTagId].map(id => {
                                            const tag = availableTags.find(t => t.id === id);
                                            return tag ? (
                                                <Badge
                                                    key={id}
                                                    className="px-3 py-1"
                                                    style={{ backgroundColor: tag.color, color: '#fff' }}
                                                >
                                                    {tag.name}
                                                </Badge>
                                            ) : null;
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* AI拆解预览 */}
                            {generatedSubTasks.length > 0 && (
                                <div className="border rounded-md p-3 space-y-2 bg-blue-50">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm font-medium">AI拆解子任务（{generatedSubTasks.length}个）</div>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setGeneratedSubTasks([])}
                                        >
                                            清空
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        {generatedSubTasks.map((subTask, index) => (
                                            <div key={index} className="bg-white p-2 rounded border border-blue-200">
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        value={subTask.title}
                                                        onChange={(e) => handleEditSubTask(index, 'title', e.target.value)}
                                                        className="flex-1 text-sm"
                                                        placeholder="子任务标题"
                                                    />
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleRemoveSubTask(index)}
                                                        className="text-red-500 hover:text-red-600"
                                                    >
                                                        <XIcon className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                {subTask.description && (
                                                    <Textarea
                                                        value={subTask.description}
                                                        onChange={(e) => handleEditSubTask(index, 'description', e.target.value)}
                                                        className="text-xs mt-1"
                                                        rows={2}
                                                        placeholder="子任务描述"
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 提交按钮 */}
                            <div className="flex gap-2 justify-end">
                                <Button variant="outline" onClick={() => {
                                    resetForm();
                                    onClose();
                                }}>
                                    取消
                                </Button>
                                <Button
                                    disabled={!title.trim() || isSubmitting || !checkRequiredTags()}
                                    onClick={() => {
                                        if (!checkRequiredTags()) {
                                            toast.error('请先选择所有必填标签分类');
                                            return;
                                        }
                                        handleSubmitForm(
                                            {
                                                title,
                                                description,
                                                priority: priority as any,
                                                status: 'pending',
                                                isLargeTask,
                                            },
                                            getSelectedTagIds()
                                        );
                                    }}
                                >
                                    {isSubmitting ? '提交中...' : '创建任务'}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        /* AI拆解模式 */
                        <div className="space-y-4">
                            <div>
                                <div className="text-sm font-medium mb-1">任务标题</div>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="输入要拆解的任务标题"
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <div className="text-sm font-medium mb-1">任务描述</div>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="详细描述任务内容"
                                    className="mt-1"
                                    rows={3}
                                />
                            </div>

                            <div>
                                <div className="text-sm font-medium mb-1">拆解指示（可选）</div>
                                <Textarea
                                    value={aiSplitPrompt}
                                    onChange={(e) => setAiSplitPrompt(e.target.value)}
                                    placeholder="例如：请按照前端、后端、测试来拆分，或按时间优先级来组织子任务"
                                    className="mt-1"
                                    rows={3}
                                />
                            </div>

                            {!generatedSubTasks.length && !isGeneratingSubTasks && (
                                <Button
                                    onClick={generateSubTasks}
                                    className="w-full bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 hover:from-violet-600 hover:via-purple-600 hover:to-pink-600 text-white"
                                >
                                    <BrainIcon className="h-4 w-4 mr-2" />
                                    开始AI拆解
                                </Button>
                            )}

                            {isGeneratingSubTasks && (
                                <div className="flex items-center justify-center p-8">
                                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                    <span>AI正在为您拆分任务...</span>
                                </div>
                            )}

                            {generatedSubTasks.length > 0 && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm font-medium">拆解结果（{generatedSubTasks.length}个子任务）</div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                setGeneratedSubTasks([]);
                                                setAiSplitPrompt('');
                                            }}
                                        >
                                            重新拆解
                                        </Button>
                                    </div>

                                    {generatedSubTasks.map((subTask, index) => (
                                        <div key={index} className="border rounded-md p-3 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    value={subTask.title}
                                                    onChange={(e) => handleEditSubTask(index, 'title', e.target.value)}
                                                    className="flex-1 font-medium"
                                                    placeholder="子任务标题"
                                                />
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleRemoveSubTask(index)}
                                                    className="text-red-500 hover:text-red-600"
                                                >
                                                    <XIcon className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <Textarea
                                                value={subTask.description || ''}
                                                onChange={(e) => handleEditSubTask(index, 'description', e.target.value)}
                                                className="text-sm"
                                                rows={2}
                                                placeholder="子任务描述"
                                            />
                                        </div>
                                    ))}

                                    <div className="border-t pt-4 space-y-4">
                                        <div className="text-sm font-medium block mb-2">选择必填标签</div>
                                        
                                        <div className="flex items-center justify-between">
                                            <div>
                                                {getSelectedTagIds().length > 0 ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {getSelectedTagIds().map(id => {
                                                            const tag = availableTags.find(t => t.id === id);
                                                            return tag ? (
                                                                <Badge
                                                                    key={id}
                                                                    className="px-3 py-1"
                                                                    style={{ backgroundColor: tag.color, color: '#fff' }}
                                                                >
                                                                    {tag.name}
                                                                </Badge>
                                                            ) : null;
                                                        })}
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">未选择标签</span>
                                                )}
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setShowRequiredTagsModal(true)}
                                            >
                                                {checkRequiredTags() ? '已选择' : '选择标签'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-2 justify-end">
                                <Button variant="outline" onClick={() => {
                                    resetForm();
                                    onClose();
                                }}>
                                    取消
                                </Button>
                                <Button
                                    disabled={!title.trim() || generatedSubTasks.length === 0 || isSubmitting || !checkRequiredTags()}
                                    onClick={() => {
                                        if (!checkRequiredTags()) {
                                            toast.error('请先选择所有必填标签分类');
                                            return;
                                        }
                                        handleSubmitForm(
                                            {
                                                title,
                                                description,
                                                priority: priority as any,
                                                status: 'pending',
                                                isLargeTask: true,
                                            },
                                            getSelectedTagIds()
                                        );
                                    }}
                                >
                                    {isSubmitting ? '创建中...' : '创建任务和子任务'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>

        {/* 必填标签选择对话框 */}
        <RequiredTagsSelection
            open={showRequiredTagsModal}
            onOpenChange={setShowRequiredTagsModal}
            allTags={availableTags}
            selectedTagIds={getSelectedTagIds()}
            onConfirm={handleRequiredTagsConfirm}
        />
        </>
    );
}