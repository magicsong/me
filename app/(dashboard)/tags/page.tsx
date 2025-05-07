'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { TagManager } from './tag-manager';
import { Loader2 } from 'lucide-react';
import { TagBO } from '@/app/api/types';
import { fetchTags, createTagApi, updateTagApi, deleteTagApi } from '../actions';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '@/components/ui/card';

export default function TagsPage() {
  const [tags, setTags] = useState<TagBO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 初始加载标签
  useEffect(() => {
    async function loadTags() {      
      try {
        setIsLoading(true);
        const result = await fetchTags();
        
        if (result.success && result.data) {
          setTags(result.data);
        } else {
          toast.error(result.message || '加载标签失败');
        }
      } catch (err) {
        toast.error('加载标签失败，请稍后再试');
        console.error('加载标签失败:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadTags();
  }, []);

  // 创建标签
  const handleCreateTag = async (tag: Omit<TagBO, "id">) => {
    try {
      const result = await createTagApi(tag);
      
      if (result.success && result.data) {
        setTags(prev => [...prev, result.data as TagBO]);
        toast.success('标签创建成功');
        return true;
      } else {
        toast.error(result.message || '创建标签失败');
        return false;
      }
    } catch (error) {
      toast.error('创建标签失败');
      console.error("创建标签失败:", error);
      return false;
    }
  };

  // 更新标签
  const handleUpdateTag = async (tag: TagBO) => {
    try {
      const result = await updateTagApi(tag);
      
      if (result.success && result.data) {
        setTags(prev => prev.map(t => t.id === tag.id ? result.data as TagBO : t));
        toast.success('标签更新成功');
        return true;
      } else {
        toast.error(result.message || '更新标签失败');
        return false;
      }
    } catch (error) {
      toast.error('更新标签失败');
      console.error("更新标签失败:", error);
      return false;
    }
  };

  // 删除标签
  const handleDeleteTag = async (tagId: number) => {
    try {
      const result = await deleteTagApi(tagId);
      
      if (result.success) {
        setTags(prev => prev.filter(t => t.id !== tagId));
        toast.success('标签删除成功');
        return true;
      } else {
        toast.error(result.message || '删除标签失败');
        return false;
      }
    } catch (error) {
      toast.error('删除标签失败');
      console.error("删除标签失败:", error);
      return false;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-8">
      <Card className="shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl">标签管理</CardTitle>
          <CardDescription>
            创建和管理各种类型的标签，用于分类您的待办事项、笔记和习惯
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TagManager
            tags={tags}
            onCreateTag={handleCreateTag}
            onUpdateTag={handleUpdateTag}
            onDeleteTag={handleDeleteTag}
          />
        </CardContent>
      </Card>
    </div>
  );
}