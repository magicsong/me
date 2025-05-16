"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, CheckCircle2, Star } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { completeHabit} from '../client-actions';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { HabitBO } from '@/app/api/types';

interface HabitChallengeDialogProps {
    isOpen: boolean;
    habitDetail: HabitBO | null;
    onClose: () => void;
    onRefresh?: () => void;
}

export function HabitChallengeDialog({
    isOpen,
    habitDetail,
    onClose,
    onRefresh
}: HabitChallengeDialogProps) {
    const router = useRouter();
    const [loadingTiers, setLoadingTiers] = useState(false);
    const [generatingTiers, setGeneratingTiers] = useState(false);
    const [tiersError, setTiersError] = useState<string | null>(null);
    const [completingTier, setCompletingTier] = useState<number | null>(null);
    const [settingDefaultTier, setSettingDefaultTier] = useState<number | null>(null);
    const [currentStatus, setCurrentStatus] = useState<string>('');

    async function handleGenerateTiers(id: number) {
        setGeneratingTiers(true);
        setTiersError(null);
        try {
            // 直接调用API生成挑战阶梯，并传递当前状态
            const response = await fetch('/api/habits/generate-tiers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ habitId: id, currentStatus }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '生成习惯挑战失败');
            }

            if (onRefresh) {
                onRefresh();
            } else {
                router.refresh();
            }
        } catch (error) {
            setTiersError((error as Error).message);
            console.error('生成习惯挑战失败:', error);
        } finally {
            setGeneratingTiers(false);
        }
    }

    async function handleCompleteTier(habitId: number, tierId: number) {
        try {
            setCompletingTier(tierId);
            await completeHabit(habitId, {tierId});

            if (onRefresh) {
                onRefresh();
            } else {
                router.refresh();
            }

            onClose(); // 完成后关闭对话框
        } catch (error) {
            console.error('完成挑战失败:', error);
            setTiersError('完成挑战失败：' + (error as Error).message);
        } finally {
            setCompletingTier(null);
        }
    }

    async function handleSetDefaultTier(habitId: number, tierId: number) {
        try {
            setSettingDefaultTier(tierId);
            
            // 调用API更新习惯，设置默认挑战
            const response = await fetch(`/api/habit/${habitId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: habitId,
                    fields: {'activeTierId': tierId},
                    userId: habitDetail?.userId,
                }),
            });

            if (!response.ok) {
                throw new Error('设置默认挑战失败');
            }

            // 刷新数据
            if (onRefresh) {
                onRefresh();
            } else {
                router.refresh();
            }

        } catch (error) {
            console.error('设置默认挑战失败:', error);
            setTiersError('设置默认挑战失败：' + (error as Error).message);
        } finally {
            setSettingDefaultTier(null);
        }
    }

    const getTierColors = (level: number) => {
        return {
            1: 'border-green-500 bg-green-50 hover:bg-green-100',
            2: 'border-amber-500 bg-amber-50 hover:bg-amber-100',
            3: 'border-red-500 bg-red-50 hover:bg-red-100',
        }[level] || 'border-gray-500 bg-gray-50 hover:bg-gray-100';
    };

    const getTierLabel = (level: number) => {
        return {
            1: '初级',
            2: '中级',
            3: '高级',
        }[level] || '其他';
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>习惯挑战 - {habitDetail?.name}</DialogTitle>
                    <DialogDescription>
                        选择不同难度的挑战，完成后获得相应的奖励点数。
                    </DialogDescription>
                </DialogHeader>

                {loadingTiers ? (
                    <div className="flex justify-center p-6">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : (
                    <>
                        {tiersError && (
                            <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
                                {tiersError}
                            </div>
                        )}

                        {(!habitDetail?.challengeTiers || habitDetail.challengeTiers.length === 0) ? (
                            <div className="text-center p-6">
                                <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                                <h3 className="text-lg font-medium mb-2">还没有习惯挑战</h3>
                                <p className="text-muted-foreground mb-4">
                                    创建不同难度的挑战阶梯，完成后获得额外奖励。
                                </p>
                                
                                <div className="mb-4">
                                    <Label htmlFor="currentStatus" className="text-left block mb-2">
                                        请描述您当前的状态（可选）
                                    </Label>
                                    <Textarea
                                        id="currentStatus"
                                        placeholder="例如：我目前每周跑步两次，每次30分钟，想提高耐力和频率..."
                                        value={currentStatus}
                                        onChange={(e) => setCurrentStatus(e.target.value)}
                                        className="min-h-[80px]"
                                    />
                                </div>
                                
                                <Button
                                    onClick={() => habitDetail && handleGenerateTiers(habitDetail.id)}
                                    disabled={generatingTiers}
                                >
                                    {generatingTiers ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            AI生成中...
                                        </>
                                    ) : 'AI生成挑战'}
                                </Button>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-4 my-4">
                                    {habitDetail.challengeTiers.map((tier) => {
                                        const tierColors = getTierColors(tier.level);
                                        const isCompleting = completingTier === tier.id;
                                        const isCompleted = habitDetail.completedTier === tier.id;
                                        const isDefault = habitDetail.activeTierId === tier.id;
                                        const isSettingDefault = settingDefaultTier === tier.id;

                                        return (
                                            <div
                                                key={tier.id}
                                                className={`border-l-4 p-4 rounded-md ${tierColors} ${isCompleted ? 'ring-2 ring-amber-400' : ''} ${isDefault ? 'ring-1 ring-blue-400' : ''} transition-all duration-200`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-medium flex items-center gap-2">
                                                            {tier.name}
                                                            <Badge variant={tier.level === 3 ? "destructive" : tier.level === 2 ? "default" : "secondary"}>
                                                                {getTierLabel(tier.level)}
                                                            </Badge>
                                                            {isCompleted && (
                                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                                    <CheckCircle2 className="h-3 w-3 mr-1" /> 今日已完成
                                                                </Badge>
                                                            )}
                                                            {isDefault && (
                                                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                                    <Star className="h-3 w-3 mr-1" /> 默认
                                                                </Badge>
                                                            )}
                                                        </h4>
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            {tier.description}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2 items-center">
                                                        <Badge variant="outline" className="text-amber-600">
                                                            +{tier.reward_points} 奖励
                                                        </Badge>
                                                        <div className="flex gap-1">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className={`${isDefault ? 'bg-blue-50' : ''}`}
                                                                disabled={isSettingDefault || isDefault}
                                                                onClick={() => handleSetDefaultTier(habitDetail.id, tier.id)}
                                                            >
                                                                {isSettingDefault ? (
                                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                                                ) : isDefault ? (
                                                                    <>
                                                                        <Star className="h-4 w-4 mr-1 text-blue-500" /> 默认
                                                                    </>
                                                                ) : '设为默认'}
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant={isCompleted ? "secondary" : "outline"}
                                                                disabled={isCompleting || isCompleted}
                                                                onClick={() => handleCompleteTier(habitDetail.id, tier.id)}
                                                            >
                                                                {isCompleting ? (
                                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                                                ) : isCompleted ? (
                                                                    <>
                                                                        <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" /> 已完成
                                                                    </>
                                                                ) : '选择完成'}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <DialogFooter className="flex-col gap-4 sm:flex-row">
                                    <div className="w-full sm:w-2/3">
                                        <Label htmlFor="regenerateStatus" className="text-left block mb-2">
                                            请描述您当前的状态（可选）
                                        </Label>
                                        <Textarea
                                            id="regenerateStatus"
                                            placeholder="描述您的当前状态以获取更个性化的挑战"
                                            value={currentStatus}
                                            onChange={(e) => setCurrentStatus(e.target.value)}
                                            className="min-h-[60px]"
                                        />
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={() => habitDetail && handleGenerateTiers(habitDetail.id)}
                                        disabled={generatingTiers}
                                        className="sm:self-end"
                                    >
                                        {generatingTiers ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                                                重新生成
                                            </>
                                        ) : '重新生成挑战'}
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
