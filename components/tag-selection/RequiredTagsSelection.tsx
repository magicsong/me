"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TagCategorySelector } from "./TagCategorySelector";
import { useState, useEffect } from "react";

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
  onConfirm: (tagIds: number[]) => void;
}

export function RequiredTagsSelection({
  open,
  onOpenChange,
  allTags,
  selectedTagIds,
  onConfirm,
}: any) {
  const [selectedDecisionTypeTagId, setSelectedDecisionTypeTagId] = useState<number | null>(null);
  const [selectedDomainTypeTagId, setSelectedDomainTypeTagId] = useState<number | null>(null);
  const [selectedWorkNatureTagId, setSelectedWorkNatureTagId] = useState<number | null>(null);

  // 初始化已选择的标签
  useEffect(() => {
    if (open) {
      const decisionTag = (selectedTagIds as any[]).find((id: any) => 
        (allTags as any[]).find((t: any) => t.id === id && t.category === 'decision_type')
      );
      const domainTag = (selectedTagIds as any[]).find((id: any) => 
        (allTags as any[]).find((t: any) => t.id === id && t.category === 'domain_type')
      );
      const workTag = (selectedTagIds as any[]).find((id: any) => 
        (allTags as any[]).find((t: any) => t.id === id && t.category === 'work_nature')
      );

      setSelectedDecisionTypeTagId(decisionTag || null);
      setSelectedDomainTypeTagId(domainTag || null);
      setSelectedWorkNatureTagId(workTag || null);
    }
  }, [open, selectedTagIds, allTags]);

  const checkRequiredTags = () => {
    return selectedDecisionTypeTagId !== null && 
           selectedDomainTypeTagId !== null && 
           selectedWorkNatureTagId !== null;
  };

  const getSelectedTagNames = () => {
    const selectedIds = [selectedDecisionTypeTagId, selectedDomainTypeTagId, selectedWorkNatureTagId]
      .filter(Boolean) as number[];
    return (allTags as any[])
      .filter((t: any) => selectedIds.includes(t.id))
      .map((t: any) => ({ ...t, name: t.name }));
  };

  const handleConfirm = () => {
    const selectedIds = [selectedDecisionTypeTagId, selectedDomainTypeTagId, selectedWorkNatureTagId]
      .filter(Boolean) as number[];
    onConfirm(selectedIds);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>选择必填标签</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <TagCategorySelector
            label="决策类 - 帮你判断'先做什么'"
            category="decision_type"
            tags={allTags}
            selectedTagId={selectedDecisionTypeTagId}
            onSelect={setSelectedDecisionTypeTagId}
          />

          <TagCategorySelector
            label="领域类 - 避免碎片化，能看出精力投入分布"
            category="domain_type"
            tags={allTags}
            selectedTagId={selectedDomainTypeTagId}
            onSelect={setSelectedDomainTypeTagId}
          />

          <TagCategorySelector
            label="工作性质 - 区分'产出型'和'救火型'"
            category="work_nature"
            tags={allTags}
            selectedTagId={selectedWorkNatureTagId}
            onSelect={setSelectedWorkNatureTagId}
          />

          {!checkRequiredTags() && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                请为三个标签分类各选择一个
              </AlertDescription>
            </Alert>
          )}

          {checkRequiredTags() && (
            <div className="flex flex-wrap gap-2 pt-2">
              {getSelectedTagNames().map((tag: any) => (
                <Badge
                  key={tag.id}
                  className="px-3 py-1"
                  style={{ backgroundColor: tag.color, color: '#fff' }}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!checkRequiredTags()}>
            确认选择
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
