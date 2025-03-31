"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LLMHistoryResponse } from '@/lib/types/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export default function LlmHistoryList() {
  const router = useRouter();
  const [history, setHistory] = useState<LLMHistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/ai/history?page=${page}&pageSize=${pageSize}`);
        if (!res.ok) throw new Error('获取历史记录失败');
        const data = await res.json();
        setHistory(data);
      } catch (error) {
        console.error('获取历史记录失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [page]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const viewDetail = (id: number) => {
    router.push(`/ai-history/${id}`);
  };

  if (loading && !history) {
    return <div className="flex items-center justify-center h-40">加载中...</div>;
  }

  if (!history || history.records.length === 0) {
    return <div className="text-center p-8">暂无大模型互动历史记录</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {history.records.map((record) => (
          <Card key={record.id} className="hover:bg-muted/50 cursor-pointer transition-colors" 
                onClick={() => viewDetail(record.id)}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex justify-between">
                <span className="font-medium truncate flex-1">{record.model}</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(record.createdAt).toLocaleString()}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm line-clamp-2">{record.prompt}</p>
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{record.responseContent}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {history.pagination.totalPages > 1 && (
        <Pagination className="mt-4">
          <PaginationContent>
            {page > 1 && (
              <PaginationItem>
                <PaginationPrevious onClick={() => handlePageChange(page - 1)} />
              </PaginationItem>
            )}
            
            {Array.from({ length: Math.min(5, history.pagination.totalPages) }, (_, i) => {
              const pageNumber = i + 1;
              return (
                <PaginationItem key={pageNumber}>
                  <PaginationLink
                    isActive={page === pageNumber}
                    onClick={() => handlePageChange(pageNumber)}
                  >
                    {pageNumber}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            
            {history.pagination.totalPages > 5 && <PaginationItem>...</PaginationItem>}
            
            {page < history.pagination.totalPages && (
              <PaginationItem>
                <PaginationNext onClick={() => handlePageChange(page + 1)} />
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
