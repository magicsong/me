"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeftIcon, PencilIcon, TrashIcon, ClockIcon, TagIcon, FolderIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import ReadOnlyTipTap from "@/components/notes/ReadOnlyTipTap";

export default function NoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const noteId = params.id;

  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchNoteDetails() {
      setLoading(true);
      try {
        const response = await fetch(`/api/note/${noteId}`);
        if (!response.ok) {
          throw new Error("笔记不存在或无法获取");
        }
        const data = await response.json();
        setNote(data);
      } catch (err) {
        setError(err.message || "获取笔记详情失败");
        console.error("获取笔记详情错误:", err);
      } finally {
        setLoading(false);
      }
    }

    if (noteId) {
      fetchNoteDetails();
    }
  }, [noteId]);

  async function handleDelete() {
    if (!confirm("确定要删除这个笔记吗？此操作不可撤销。")) {
      return;
    }

    try {
      const response = await fetch(`/api/note?id=${noteId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("删除笔记失败");
      }

      router.push("/notes");
    } catch (err) {
      console.error("删除笔记错误:", err);
      alert("删除失败: " + err.message);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error || "无法加载笔记"}</p>
          <Link href="/notes" className="text-blue-500 hover:underline mt-2 inline-block">
            返回笔记列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link 
          href="/notes" 
          className="inline-flex items-center text-blue-500 hover:text-blue-700 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          返回笔记列表
        </Link>
        
        <div className="flex justify-between items-start">
          <h1 className="text-3xl font-bold">{note.title}</h1>
          
          <div className="flex space-x-2">
            <Link 
              href={`/notes/edit/${noteId}`}
              className="px-3 py-1.5 bg-blue-500 text-white rounded-md flex items-center hover:bg-blue-600 transition-colors"
            >
              <PencilIcon className="h-4 w-4 mr-1" />
              编辑
            </Link>
            <button 
              onClick={handleDelete}
              className="px-3 py-1.5 bg-red-500 text-white rounded-md flex items-center hover:bg-red-600 transition-colors"
            >
              <TrashIcon className="h-4 w-4 mr-1" />
              删除
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center text-sm text-gray-500 mt-2 gap-4">
          <div className="flex items-center">
            <ClockIcon className="h-4 w-4 mr-1" />
            更新于: {format(new Date(note.updatedAt), "yyyy-MM-dd HH:mm")}
          </div>
          {note.createdAt && (
            <div className="flex items-center">
              <ClockIcon className="h-4 w-4 mr-1" />
              创建于: {format(new Date(note.createdAt), "yyyy-MM-dd HH:mm")}
            </div>
          )}
          {note.category && (
            <div className="flex items-center">
              <FolderIcon className="h-4 w-4 mr-1" />
              分类: {note.category}
            </div>
          )}
        </div>
        
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            <TagIcon className="h-4 w-4 text-gray-500" />
            {note.tags.map(tag => (
              <span 
                key={tag.id} 
                className="px-2 py-0.5 bg-blue-50 text-blue-600 text-sm rounded-full"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-6 border">
        <ReadOnlyTipTap content={note.content} />
      </div>
    </div>
  );
}
