'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/hooks/use-toast';
import { Trash, Edit, Plus, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// 定义标签类型接口
interface PomodoroTag {
  id: string;
  name: string;
  color?: string;
}

export function PomodoroTagManager() {
  const { toast } = useToast();
  const [tags, setTags] = useState<PomodoroTag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editedTagName, setEditedTagName] = useState('');

  useEffect(() => {
    // 从本地存储加载标签
    const loadTags = () => {
      try {
        const savedTags = localStorage.getItem('pomodoroTags');
        if (savedTags) {
          setTags(JSON.parse(savedTags));
        }
      } catch (error) {
        console.error('加载标签失败:', error);
      }
    };
    
    loadTags();
  }, []);

  // 保存标签到本地存储
  const saveTags = (updatedTags: PomodoroTag[]) => {
    try {
      localStorage.setItem('pomodoroTags', JSON.stringify(updatedTags));
    } catch (error) {
      console.error('保存标签失败:', error);
    }
  };

  // 添加新标签
  const addTag = () => {
    if (!newTagName.trim()) {
      toast({
        title: "错误",
        description: "标签名称不能为空",
        variant: "destructive",
      });
      return;
    }

    const newTag: PomodoroTag = {
      id: Date.now().toString(),
      name: newTagName.trim(),
    };

    const updatedTags = [...tags, newTag];
    setTags(updatedTags);
    saveTags(updatedTags);
    setNewTagName('');
    
    toast({
      title: "成功",
      description: "标签已添加",
    });
  };

  // 更新标签
  const updateTag = (id: string) => {
    if (!editedTagName.trim()) {
      toast({
        title: "错误",
        description: "标签名称不能为空",
        variant: "destructive",
      });
      return;
    }

    const updatedTags = tags.map(tag => 
      tag.id === id ? { ...tag, name: editedTagName.trim() } : tag
    );
    
    setTags(updatedTags);
    saveTags(updatedTags);
    setEditingTagId(null);
    
    toast({
      title: "成功",
      description: "标签已更新",
    });
  };

  // 删除标签
  const deleteTag = (id: string) => {
    const updatedTags = tags.filter(tag => tag.id !== id);
    setTags(updatedTags);
    saveTags(updatedTags);
    
    toast({
      title: "成功",
      description: "标签已删除",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-2">
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="new-tag">新标签名称</Label>
          <Input
            id="new-tag"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="输入标签名称"
          />
        </div>
        <Button onClick={addTag}>
          <Plus className="mr-2 h-4 w-4" /> 添加
        </Button>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">已有标签</h3>
        
        {tags.length === 0 ? (
          <p className="text-muted-foreground">暂无标签，请添加新标签</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <div key={tag.id} className="flex items-center">
                {editingTagId === tag.id ? (
                  <div className="flex items-center border rounded-md p-1">
                    <Input
                      value={editedTagName}
                      onChange={(e) => setEditedTagName(e.target.value)}
                      className="h-7 w-32"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => updateTag(tag.id)}
                      className="h-7 w-7"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setEditingTagId(null)}
                      className="h-7 w-7"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Badge className="flex items-center gap-1 px-3 py-1">
                    <span>{tag.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 p-0 ml-1"
                      onClick={() => {
                        setEditingTagId(tag.id);
                        setEditedTagName(tag.name);
                      }}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 p-0 ml-1"
                        >
                          <Trash className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>确认删除</AlertDialogTitle>
                          <AlertDialogDescription>
                            您确定要删除标签 "{tag.name}" 吗？相关的番茄钟记录将会保留但不再与此标签关联。
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>取消</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteTag(tag.id)}>
                            删除
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}