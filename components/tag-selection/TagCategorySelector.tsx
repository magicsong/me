"use client";

import { Button } from "@/components/ui/button";

interface Tag {
  id: number;
  name: string;
  color: string;
  category?: 'decision_type' | 'domain_type' | 'work_nature';
}

interface TagCategorySelectorProps {
  label: string;
  description?: string;
  category: 'decision_type' | 'domain_type' | 'work_nature';
  tags: Tag[];
  selectedTagId: number | null;
  onSelect: (tagId: number) => void;
}

export function TagCategorySelector({
  label,
  description,
  category,
  tags,
  selectedTagId,
  onSelect,
}: any) {
  const filteredTags = (tags as any[]).filter((t: any) => t.category === category);

  return (
    <div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      {description && (
        <p className="text-xs text-muted-foreground mb-2">{description}</p>
      )}
      <div className="flex flex-wrap gap-2 mt-2">
        {filteredTags.map((tag: any) => (
          <Button
            key={tag.id}
            type="button"
            variant={selectedTagId === tag.id ? 'default' : 'outline'}
            className={selectedTagId === tag.id ? 'ring-2 ring-offset-2' : ''}
            onClick={() => onSelect(tag.id)}
            style={selectedTagId === tag.id ? { 
              backgroundColor: tag.color, 
              color: '#fff', 
              borderColor: tag.color 
            } : { 
              borderColor: tag.color 
            }}
          >
            <div className="flex items-center gap-2">
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: tag.color }}
              />
              {tag.name}
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
}
