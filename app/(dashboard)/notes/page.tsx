"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PlusIcon, PencilIcon, TrashIcon, DocumentIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import QuickNoteModal from "@/components/notes/QuickNoteModal";
import NoteFilter from "@/components/notes/NoteFilter";
import { BaseResponse } from "@/app/api/lib/types";
import { NoteBO } from "@/app/api/types";

export default function NotePage() {
  const [notes, setNotes] = useState<NoteBO>([]);
  const [loading, setLoading] = useState(true);
  const [isQuickNoteOpen, setIsQuickNoteOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const tag = searchParams.get('tag') || '';
  const sortBy = searchParams.get('sortBy') || 'updatedAt';
  const order = searchParams.get('order') || 'desc';

  useEffect(() => {
    fetchNotes();
  }, [search, category, tag, sortBy, order]);

  async function fetchNotes() {
    setLoading(true);
    try {
      let url = `/api/note?sortBy=${sortBy}&sortDirection=${order}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (category) url += `&category=${encodeURIComponent(category)}`;
      if (tag) url += `&tag=${encodeURIComponent(tag)}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch notes");
      const data = await response.json() as BaseResponse<NoteBO>;
      if (data.success) {
        setNotes(data.data);
      }
      else {
        console.error("Error fetching notes:", data.error);
      }
    } catch (error) {
      console.error("Error loading notes:", error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteNote(id: number) {
    if (!confirm("确定要删除这个笔记吗？")) return;

    try {
      const response = await fetch(`/api/note?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete note");

      fetchNotes();
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  }

  function getPreviewText(content: string) {
    // 去除Markdown标记并截取前100个字符作为预览
    return content
      .replace(/\!\[.*?\]\(.*?\)/g, '[图片]') // 移除图片
      .replace(/\[.*?\]\(.*?\)/g, '$1')      // 转换链接
      .replace(/(?:\*\*|__)(.*?)(?:\*\*|__)/g, '$1') // 移除粗体
      .replace(/(?:\*|_)(.*?)(?:\*|_)/g, '$1')       // 移除斜体
      .replace(/(?:#{1,6})\s+/g, '')         // 移除标题标记
      .replace(/(?:```|~~~)[\s\S]*?(?:```|~~~)/g, '[代码块]') // 替换代码块
      .substring(0, 100) + "...";
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">我的笔记</h1>
        <div className="flex space-x-2">
          <button
            onClick={() => setIsQuickNoteOpen(true)}
            className="px-4 py-2 bg-green-500 text-white rounded-md flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-1" />
            快速笔记
          </button>
          <Link
            href="/notes/new"
            className="px-4 py-2 bg-blue-500 text-white rounded-md flex items-center"
          >
            <DocumentIcon className="h-5 w-5 mr-1" />
            新建长文
          </Link>
        </div>
      </div>

      <NoteFilter />

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-gray-500">暂无笔记，开始创建新的笔记吧！</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.map((note: any) => (
            <div
              key={note.id}
              className="border rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow"
            >
              <Link href={`/notes/${note.id}`}>
                <div className="p-5">
                  <h2 className="text-xl font-semibold mb-2 line-clamp-1">{note.title}</h2>
                  <div className="text-gray-600 text-sm mb-3 flex items-center">
                    <span>
                      {format(new Date(note.updatedAt), "yyyy-MM-dd HH:mm")}
                    </span>
                    {note.category && (
                      <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded-full text-xs">
                        {note.category}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-sm line-clamp-3">
                    {getPreviewText(note.content)}
                  </p>
                  {note.tags && note.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {note.tags.map((tag: any) => (
                        <span
                          key={tag.id}
                          className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
              <div className="border-t px-5 py-2 flex justify-end space-x-2">
                <Link
                  href={`/notes/edit/${note.id}`}
                  className="p-1 text-gray-500 hover:text-blue-500"
                >
                  <PencilIcon className="h-5 w-5" />
                </Link>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="p-1 text-gray-500 hover:text-red-500"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 快速笔记模态框 */}
      <QuickNoteModal
        isOpen={isQuickNoteOpen}
        onClose={() => setIsQuickNoteOpen(false)}
        onSaved={fetchNotes}
      />
    </div>
  );
}
