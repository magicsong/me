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
import { ChromePicker } from 'react-color';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// 定义标签类型接口
interface TodoTag {
  id: number;
  name: string;
  color: string;
  user_id?: string;
  created_at?: string;
}

interface TodoTagManagerProps {
  onTagsChange?: () => void;
}

// 生成随机颜色
function generateRandomColor(): string {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

export function TodoTagManager({ onTagsChange }: TodoTagManagerProps) {
  const { toast } = useToast();
  const [tags, setTags] = useState<TodoTag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(generateRandomColor()); // 使用随机颜色
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [editedTagName, setEditedTagName] = useState('');
  const [editedTagColor, setEditedTagColor] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // 加载标签
  useEffect(() => {
    fetchTags();
  }, []);

  // 获取标签列表
  const fetchTags = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/todolist/tags');
      
      if (!response.ok) {
        throw new Error('获取标签失败');
      }
      
      const data = await response.json();
      setTags(data);
    } catch (error) {
      console.error('获取标签失败:', error);
      toast({
        title: "错误",
        description: "获取标签失败，请稍后再试",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 添加新标签
  const addTag = async () => {
    if (!newTagName.trim()) {
      toast({
        title: "错误",
        description: "标签名称不能为空",
        variant: "destructive",
      });
      return;
    }

    // 检查是否存在相同的标签
    const trimmedName = newTagName.trim();
    const isDuplicate = tags.some(tag => 
      tag.name.toLowerCase() === trimmedName.toLowerCase() && 
      tag.color === newTagColor
    );

    if (isDuplicate) {
      toast({
        title: "错误",
        description: "已存在相同的标签",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/todolist/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trimmedName,
          color: newTagColor,
        }),
      });
      
      if (!response.ok) {
        throw new Error('创建标签失败');
      }
      
      await fetchTags();
      setNewTagName('');
      setNewTagColor(generateRandomColor()); // 重置为新的随机颜色
      
      toast({
        title: "成功",
        description: "标签已添加",
      });
      
      if (onTagsChange) {
        onTagsChange();
      }
    } catch (error) {
      console.error('创建标签失败:', error);
      toast({
        title: "错误",
        description: "创建标签失败",
        variant: "destructive",
      });
    }
  };

  // 更新标签
  const updateTag = async (id: number) => {
    if (!editedTagName.trim()) {
      toast({
        title: "错误",
        description: "标签名称不能为空",
        variant: "destructive",
      });
      return;
    }
    
    // 检查是否与现有标签重复
    const trimmedName = editedTagName.trim();
    const isDuplicate = tags.some(tag => 
      tag.id !== id && // 排除自身
      tag.name.toLowerCase() === trimmedName.toLowerCase() && 
      tag.color === editedTagColor
    );
    
    if (isDuplicate) {
      toast({
        title: "错误",
        description: "已存在相同的标签",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/todolist/tags/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editedTagName.trim(),
          color: editedTagColor,
        }),
      });
      
      if (!response.ok) {
        throw new Error('更新标签失败');
      }
      
      await fetchTags();
      setEditingTagId(null);
      
      toast({
        title: "成功",
        description: "标签已更新",
      });
      
      if (onTagsChange) {
        onTagsChange();
      }
    } catch (error) {
      console.error('更新标签失败:', error);
      toast({
        title: "错误",
        description: "更新标签失败",
        variant: "destructive",
      });
    }
  };

  // 删除标签
  const deleteTag = async (id: number) => {
    try {
      const response = await fetch(`/api/todolist/tags/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('删除标签失败');
      }
      
      await fetchTags();
      
      toast({
        title: "成功",
        description: "标签已删除",
      });
      
      if (onTagsChange) {
        onTagsChange();
      }
    } catch (error) {
      console.error('删除标签失败:', error);
      toast({
        title: "错误",
        description: "删除标签失败",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-2 flex-wrap md:flex-nowrap">
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="new-tag">新标签名称</Label>
          <Input
            id="new-tag"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="输入标签名称"
          />
        </div>
        
        <div className="grid w-full max-w-[100px] items-center gap-1.5">
          <Label htmlFor="new-tag-color">颜色</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full h-10"
                style={{ backgroundColor: newTagColor }}
              >
                <span className="sr-only">选择颜色</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <ChromePicker 
                color={newTagColor} 
                onChange={(color) => setNewTagColor(color.hex)} 
                disableAlpha={true}
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <Button onClick={addTag} className="mt-auto">
          <Plus className="mr-2 h-4 w-4" /> 添加
        </Button>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium">已有标签</h3>
        
        {isLoading ? (
          <p className="text-muted-foreground">加载中...</p>
        ) : tags.length === 0 ? (
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
                      className="h-7 w-32 mr-1"
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="outline" 
                          className="w-7 h-7 p-1 mr-1"
                          style={{ backgroundColor: editedTagColor }}
                        >
                          <span className="sr-only">选择颜色</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <ChromePicker 
                          color={editedTagColor} 
                          onChange={(color) => setEditedTagColor(color.hex)} 
                          disableAlpha={true}
                        />
                      </PopoverContent>
                    </Popover>
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
                  <Badge 
                    className="flex items-center gap-1 px-3 py-1"
                    style={{ backgroundColor: tag.color, color: getContrastColor(tag.color) }}
                  >
                    <span>{tag.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 p-0 ml-1"
                      onClick={() => {
                        setEditingTagId(tag.id);
                        setEditedTagName(tag.name);
                        setEditedTagColor(tag.color);
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
                            您确定要删除标签 "{tag.name}" 吗？相关的待办事项将会保留但不再与此标签关联。
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

// 计算文本颜色（黑/白）以确保在彩色背景上可见
function getContrastColor(hexColor: string): string {
  // 移除井号
  const hex = hexColor.replace('#', '');
  
  // 将hex转换为RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // 计算亮度
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // 如果亮度高于128，返回黑色，否则返回白色
  return brightness > 128 ? '#000000' : '#FFFFFF';
}
