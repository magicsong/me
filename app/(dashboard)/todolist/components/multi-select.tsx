'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Command, CommandGroup, CommandItem } from '@/components/ui/command';
import { Command as CommandPrimitive } from 'cmdk';

type Option = {
  value: string;
  label: string;
};

interface MultiSelectProps {
  options: Option[];
  selected: Option[];
  onChange: (selected: Option[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = '选择...',
  className,
}: MultiSelectProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');

  // 创建已选项和可选项的集合，用于快速查找
  const selectedValues = new Set(selected.map((option) => option.value));
  
  // 过滤选项，只显示尚未选择的选项
  const filteredOptions = options.filter((option) => {
    const matchesInput = option.label.toLowerCase().includes(inputValue.toLowerCase());
    const isNotSelected = !selectedValues.has(option.value);
    return matchesInput && isNotSelected;
  });

  // 处理选择选项
  const handleSelect = (option: Option) => {
    const newSelected = [...selected, option];
    onChange(newSelected);
    setInputValue('');
  };

  // 处理移除选项
  const handleRemove = (option: Option) => {
    const newSelected = selected.filter((item) => item.value !== option.value);
    onChange(newSelected);
  };

  // 处理键盘导航
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = inputRef.current;
    if (input) {
      // 处理退格键删除最后一个选项
      if (e.key === 'Backspace' && !inputValue && selected.length > 0) {
        handleRemove(selected[selected.length - 1]);
      }
      
      // 处理Escape键关闭下拉菜单
      if (e.key === 'Escape') {
        input.blur();
      }
    }
  };

  return (
    <Command
      className={`overflow-visible bg-transparent ${className}`}
      onKeyDown={handleKeyDown}
    >
      <div className="group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <div className="flex flex-wrap gap-1">
          {selected.map((option) => (
            <Badge key={option.value} variant="secondary" className="mb-1 mr-1">
              {option.label}
              <button
                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={() => handleRemove(option)}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">移除 {option.label}</span>
              </button>
            </Badge>
          ))}
          
          <CommandPrimitive.Input
            ref={inputRef}
            value={inputValue}
            onValueChange={setInputValue}
            onBlur={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            placeholder={selected.length === 0 ? placeholder : undefined}
            className="ml-2 bg-transparent outline-none placeholder:text-muted-foreground flex-1"
          />
        </div>
      </div>
      
      <div className="relative">
        {open && filteredOptions.length > 0 && (
          <div className="absolute w-full z-10 top-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
            <CommandGroup className="h-full overflow-auto max-h-[200px]">
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => handleSelect(option)}
                  className="cursor-pointer"
                >
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        )}
      </div>
    </Command>
  );
}