import React, { useState } from 'react';
import { TodoBO } from "@/app/api/todo/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wand2 } from "lucide-react";

interface Tag {
  id: number;
  name: string;
  color: string;
}

interface TodoCreationFormProps {
  tags: Tag[];
  onCreateTodo: (todo: Partial<TodoBO>) => Promise<boolean>;
}

export function TodoCreationForm({ tags, onCreateTodo }: TodoCreationFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleManualCreate = async () => {
    setIsLoading(true);
    try {
      await onCreateTodo({
        title,
        description,
        priority,
        tagIds: selectedTags,
        status: 'pending'
      });
      
      // 重置表单
      setTitle('');
      setDescription('');
      setPriority('medium');
      setSelectedTags([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAiCreate = async () => {
    setIsLoading(true);
    // 这里只是占位符，实际AI创建功能未实现
    setTimeout(() => {
      setIsLoading(false);
      // 这里可以添加成功提示
    }, 1000);
  };

  const toggleTag = (tagId: number) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId) 
        : [...prev, tagId]
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>创建新任务</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="manual">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="manual">手动创建</TabsTrigger>
            <TabsTrigger value="ai">AI 辅助创建</TabsTrigger>
          </TabsList>
          
          <TabsContent value="manual" className="space-y-4">
            <div>
              <Input
                placeholder="任务标题"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            
            <div>
              <Textarea
                placeholder="任务描述（可选）"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            
            <div>
              <Select 
                value={priority} 
                onValueChange={setPriority}
              >
                <SelectTrigger>
                  <SelectValue placeholder="优先级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">高</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="low">低</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2">标签</h3>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={selectedTags.includes(tag.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    style={
                      selectedTags.includes(tag.id) 
                        ? { backgroundColor: tag.color, color: '#fff', borderColor: tag.color }
                        : { backgroundColor: `${tag.color}20`, borderColor: tag.color }
                    }
                    onClick={() => toggleTag(tag.id)}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="ai">
            <div className="space-y-4">
              <Textarea
                placeholder="描述你要创建的任务，AI 将帮你自动填充详细信息..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={5}
              />
              <Button 
                className="w-full flex items-center gap-2" 
                onClick={handleAiCreate}
                disabled={!aiPrompt.trim() || isLoading}
              >
                <Wand2 className="h-4 w-4" />
                生成任务
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-end">
        <Button 
          onClick={handleManualCreate} 
          disabled={!title.trim() || isLoading}
        >
          创建任务
        </Button>
      </CardFooter>
    </Card>
  );
}
