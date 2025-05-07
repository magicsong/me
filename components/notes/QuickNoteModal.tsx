"use client";

import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import TipTapEditor from "./TipTapEditor";

interface QuickNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function QuickNoteModal({ isOpen, onClose, onSaved }: QuickNoteModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleSave() {
    if (!title.trim() || !content.trim()) {
      setError("标题和内容不能为空");
      return;
    }
    
    setSubmitting(true);
    setError("");
    
    try {
      // 准备标签数据
      const tagList = tags
        ? tags.split(",").map(tag => tag.trim()).filter(tag => tag)
        : [];
        
      const response = await fetch("/api/note", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({data:{
          title,
          content,
          category: category || undefined,
          tags: tagList.length > 0 ? tagList : undefined,
        }}),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "创建笔记失败");
      }
      
      // 重置表单
      setTitle("");
      setContent("");
      setCategory("");
      setTags("");
      
      // 调用保存成功的回调
      onSaved();
      
      // 关闭模态框
      onClose();
    } catch (error) {
      console.error("保存笔记出错:", error);
      setError(error.message || "保存笔记时发生错误");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">快速笔记</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-4">
          {error && (
            <div className="mb-4 p-2 bg-red-50 text-red-600 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              标题
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="笔记标题"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
              内容
            </label>
            <TipTapEditor 
              content={content} 
              onChange={setContent} 
              placeholder="在这里输入笔记内容..."
              className="focus:outline-none focus:ring-0 focus:border-gray-300" 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                分类 (可选)
              </label>
              <input
                type="text"
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="笔记分类"
              />
            </div>
            
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                标签 (可选，用逗号分隔)
              </label>
              <input
                type="text"
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full p-2 border rounded-md"
                placeholder="标签1, 标签2"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md text-gray-600"
              disabled={submitting}
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300"
              disabled={submitting}
            >
              {submitting ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
