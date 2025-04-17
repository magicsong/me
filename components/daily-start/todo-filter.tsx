import React from 'react';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

interface Tag {
  id: number;
  name: string;
  color: string;
}

interface TodoFilterProps {
  tags: Tag[];
  selectedTags: number[];
  searchQuery: string;
  onTagSelect: (tagId: number) => void;
  onSearchChange: (query: string) => void;
}

export function TodoFilter({ 
  tags, 
  selectedTags, 
  searchQuery, 
  onTagSelect, 
  onSearchChange 
}: TodoFilterProps) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="搜索任务..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8"
        />
      </div>
      
      <div>
        <h3 className="text-sm font-medium mb-2">标签筛选</h3>
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
              onClick={() => onTagSelect(tag.id)}
            >
              {tag.name}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
