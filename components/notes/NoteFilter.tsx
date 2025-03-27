"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MagnifyingGlassIcon, AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";

export default function NoteFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [tag, setTag] = useState(searchParams.get('tag') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'updatedAt');
  const [order, setOrder] = useState(searchParams.get('order') || 'desc');
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // 获取所有分类和标签
  useEffect(() => {
    async function fetchCategoriesAndTags() {
      try {
        const response = await fetch('/api/note/metadata');
        if (!response.ok) throw new Error("Failed to fetch metadata");
        const data = await response.json();
        setCategories(data.categories || []);
        setTags(data.tags || []);
      } catch (error) {
        console.error("Error loading metadata:", error);
      }
    }
    
    fetchCategoriesAndTags();
  }, []);
  
  // 应用筛选条件
  function applyFilters() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    if (tag) params.set('tag', tag);
    if (sortBy) params.set('sortBy', sortBy);
    if (order) params.set('order', order);
    
    router.push(`/notes?${params.toString()}`);
  }
  
  // 重置筛选条件
  function resetFilters() {
    setSearch('');
    setCategory('');
    setTag('');
    setSortBy('updatedAt');
    setOrder('desc');
    router.push('/notes');
  }
  
  // 搜索框回车事件
  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      applyFilters();
    }
  }

  return (
    <div className="mb-6">
      <div className="flex items-center mb-2">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="搜索笔记..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="ml-2 p-2 border rounded-md hover:bg-gray-50"
          title="显示筛选选项"
        >
          <AdjustmentsHorizontalIcon className="h-5 w-5 text-gray-600" />
        </button>
        <button
          onClick={applyFilters}
          className="ml-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          筛选
        </button>
      </div>
      
      {showFilters && (
        <div className="p-4 border rounded-md bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">全部分类</option>
                {categories.map((cat: string) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">标签</label>
              <select
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">全部标签</option>
                {tags.map((tag: {id: number, name: string}) => (
                  <option key={tag.id} value={tag.name}>{tag.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">排序字段</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="updatedAt">最近更新</option>
                <option value="createdAt">创建时间</option>
                <option value="title">标题</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">排序方向</label>
              <select
                value={order}
                onChange={(e) => setOrder(e.target.value)}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="desc">降序</option>
                <option value="asc">升序</option>
              </select>
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-gray-600 border rounded-md hover:bg-gray-100 mr-2"
            >
              重置
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
