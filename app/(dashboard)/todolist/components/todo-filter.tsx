'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TodoFilterProps {
  onFilterChange: (filters: {
    status?: string;
    priority?: string;
    search?: string;
    tagId?: number;
  }) => void;
}

export function TodoFilter({ onFilterChange }: TodoFilterProps) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [activeFilters, setActiveFilters] = useState<{
    status?: { value: string; label: string };
    priority?: { value: string; label: string };
  }>({});

  const handleSearch = () => {
    onFilterChange({ search, status, priority });
  };

  const handleClearSearch = () => {
    setSearch('');
    onFilterChange({ search: '', status, priority });
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    
    // 更新活动过滤器
    const newActiveFilters = { ...activeFilters };
    if (value) {
      const statusLabels: Record<string, string> = {
        'pending': '待处理',
        'in_progress': '进行中',
        'completed': '已完成',
        'archived': '已归档'
      };
      newActiveFilters.status = { value, label: statusLabels[value] || value };
    } else {
      delete newActiveFilters.status;
    }
    
    setActiveFilters(newActiveFilters);
    onFilterChange({ search, status: value, priority });
  };

  const handlePriorityChange = (value: string) => {
    setPriority(value);
    
    // 更新活动过滤器
    const newActiveFilters = { ...activeFilters };
    if (value) {
      const priorityLabels: Record<string, string> = {
        'low': '低优先级',
        'medium': '中优先级',
        'high': '高优先级',
        'urgent': '紧急优先级'
      };
      newActiveFilters.priority = { value, label: priorityLabels[value] || value };
    } else {
      delete newActiveFilters.priority;
    }
    
    setActiveFilters(newActiveFilters);
    onFilterChange({ search, status, priority: value });
  };

  const clearFilter = (filterType: 'status' | 'priority') => {
    const newActiveFilters = { ...activeFilters };
    delete newActiveFilters[filterType];
    setActiveFilters(newActiveFilters);
    
    if (filterType === 'status') {
      setStatus('');
      onFilterChange({ search, status: '', priority });
    } else if (filterType === 'priority') {
      setPriority('');
      onFilterChange({ search, status, priority: '' });
    }
  };

  const clearAllFilters = () => {
    setSearch('');
    setStatus('');
    setPriority('');
    setActiveFilters({});
    onFilterChange({ search: '', status: '', priority: '' });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row">
        <div className="flex w-full md:w-1/3">
          <Input
            placeholder="搜索待办事项..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-r-none"
          />
          <Button 
            variant="default" 
            className="rounded-l-none" 
            onClick={handleSearch}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
        
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="pending">待处理</SelectItem>
            <SelectItem value="in_progress">进行中</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
            <SelectItem value="archived">已归档</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={priority} onValueChange={handlePriorityChange}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="优先级" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部优先级</SelectItem>
            <SelectItem value="low">低</SelectItem>
            <SelectItem value="medium">中</SelectItem>
            <SelectItem value="high">高</SelectItem>
            <SelectItem value="urgent">紧急</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {(Object.keys(activeFilters).length > 0 || search) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">活动过滤器:</span>
          
          {search && (
            <Badge variant="outline" className="flex items-center gap-1">
              搜索: {search}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-4 w-4 p-0 ml-1" 
                onClick={handleClearSearch}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {activeFilters.status && (
            <Badge variant="outline" className="flex items-center gap-1">
              状态: {activeFilters.status.label}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-4 w-4 p-0 ml-1" 
                onClick={() => clearFilter('status')}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {activeFilters.priority && (
            <Badge variant="outline" className="flex items-center gap-1">
              优先级: {activeFilters.priority.label}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-4 w-4 p-0 ml-1" 
                onClick={() => clearFilter('priority')}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {(Object.keys(activeFilters).length > 0 || search) && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 ml-2 text-xs" 
              onClick={clearAllFilters}
            >
              清除全部
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
