'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { CreateHabitForm } from './create-habit-form';

export function AddHabitButton() {
  const [showForm, setShowForm] = useState(false);

  return (
    <>
      <Button 
        size="sm" 
        className="h-8 gap-1" 
        onClick={() => setShowForm(true)}
      >
        <PlusCircle className="h-3.5 w-3.5" />
        <span>添加新习惯</span>
      </Button>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>创建新习惯</DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full"
                onClick={() => setShowForm(false)}
              >
                <X className="h-3 w-3" />
                <span className="sr-only">关闭</span>
              </Button>
            </div>
            <DialogDescription>
              添加一个你想要培养的新习惯。
            </DialogDescription>
          </DialogHeader>
          <CreateHabitForm onSuccess={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
