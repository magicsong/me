'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle } from 'lucide-react';
import { TAG_CATEGORIES } from '@/lib/tag-utils';

interface Tag {
  id: number;
  name: string;
  color: string;
  category?: 'decision_type' | 'domain_type' | 'work_nature';
}

interface RequiredTagsSelectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allTags: Tag[];
  selectedTagIds: number[];
  onConfirm: (selectedTagIds: number[]) => void;
}

/**
 * 强制选择三个必填标签分类的组件
 * - 决策类（必选一个）
 * - 领域类（必选一个）  
 * - 工作性质（必选一个）
 */
export function RequiredTagsSelection({
  open,
  onOpenChange,
  allTags,
  selectedTagIds,
  onConfirm,
}: RequiredTagsSelectionProps) {
  const [selected, setSelected] = useState<Record<string, number>>({
    decision_type: selectedTagIds.find(id => {
      const tag = allTags.find(t => t.id === id);
      return tag?.category === 'decision_type';
    }) || 0,
    domain_type: selectedTagIds.find(id => {
      const tag = allTags.find(t => t.id === id);
      return tag?.category === 'domain_type';
    }) || 0,
    work_nature: selectedTagIds.find(id => {
      const tag = allTags.find(t => t.id === id);
      return tag?.category === 'work_nature';
    }) || 0,
  });

  const handleTagSelect = (category: string, tagId: number) => {
    setSelected(prev => ({
      ...prev,
      [category]: prev[category] === tagId ? 0 : tagId,
    }));
  };

  const isComplete = Object.values(selected).every(id => id !== 0);

  const handleConfirm = () => {
    if (isComplete) {
      onConfirm(Object.values(selected).filter(id => id !== 0));
      onOpenChange(false);
    }
  };

  const renderCategoryTags = (category: string) => {
    const categoryTags = allTags.filter(tag => tag.category === category);
    const selectedId = selected[category];

    return (
      <div key={category} className="space-y-3 pb-4 border-b last:border-b-0">
        <div>
          <Label className="text-base font-semibold">
            {TAG_CATEGORIES.find(c => c.value === category)?.label}
          </Label>
          <p className="text-xs text-muted-foreground mt-1">
            {category === 'decision_type' && '帮你判断"先做什么"'}
            {category === 'domain_type' && '避免碎片化，能看出精力投入分布'}
            {category === 'work_nature' && '区分"产出型"和"救火型"'}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {categoryTags.length === 0 ? (
            <p className="text-xs text-muted-foreground">暂无标签</p>
          ) : (
            categoryTags.map(tag => (
              <Badge
                key={tag.id}
                variant={selectedId === tag.id ? 'default' : 'outline'}
                className="cursor-pointer px-3 py-1.5 text-xs font-medium transition-all hover:scale-105"
                style={
                  selectedId === tag.id
                    ? { backgroundColor: tag.color, color: getContrastColor(tag.color) }
                    : { borderColor: tag.color, color: tag.color }
                }
                onClick={() => handleTagSelect(category, tag.id)}
              >
                {tag.name}
              </Badge>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>选择必填标签</DialogTitle>
          <DialogDescription>
            为此任务选择一个标签，每个分类必须选择一个
          </DialogDescription>
        </DialogHeader>

        {!isComplete && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              请为每个分类各选择一个标签
            </AlertDescription>
          </Alert>
        )}

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {['decision_type', 'domain_type', 'work_nature'].map(category =>
              renderCategoryTags(category)
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={!isComplete}>
            确认选择
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// 计算对比度颜色
function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#FFFFFF';
}
