"use client";

import { createTodo } from '@/app/(dashboard)/habits/client-actions';
import { TodoForm } from "@/app/(dashboard)/todolist/components/todo-form";
import { TodoBO } from "@/app/api/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from 'react';
import { toast } from "sonner";

interface QuickTodoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved?: () => void;
}

export default function QuickTodoModal({ isOpen, onClose, onSaved }: QuickTodoModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (
        data: Omit<TodoBO, 'id' | 'created_at' | 'updated_at' | 'completed_at'>,
        tagIds: number[]
    ) => {
        try {
            setIsSubmitting(true);

            const response = await createTodo(data);

            if (!response) {
                throw new Error("添加待办事项失败");
            }
            toast.success("待办事项已添加");
            onClose();

            if (onSaved) {
                onSaved();
            }
        } catch (error) {
            console.error("添加待办事项出错:", error);
            toast.error("添加待办事项失败，请重试");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>快速添加待办事项</DialogTitle>
                </DialogHeader>
                <div className="py-2">
                    <TodoForm
                        onSubmit={handleSubmit}
                        onCancel={onClose}
                        isModal={true}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}