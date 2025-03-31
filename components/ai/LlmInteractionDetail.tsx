"use client";

import { useState, useEffect } from 'react';
import { LLMRecordDetailResponse } from '@/lib/types/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LlmInteractionDetailProps {
  id: number;
}

export default function LlmInteractionDetail({ id }: LlmInteractionDetailProps) {
  const [detail, setDetail] = useState<LLMRecordDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/ai/history/${id}`);
        if (!res.ok) throw new Error('获取详情失败');
        const data = await res.json();
        setDetail(data);
      } catch (error) {
        console.error('获取详情失败:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchDetail();
    }
  }, [id]);

  if (loading) {
    return <div className="flex items-center justify-center h-40">加载中...</div>;
  }

  if (!detail || !detail.record) {
    return <div className="text-center p-8">未找到记录详情</div>;
  }

  const { record } = detail;

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>模型交互详情</CardTitle>
            <CardDescription>模型: {record.model}</CardDescription>
          </div>
          <div className="text-sm text-muted-foreground">
            {new Date(record.createdAt).toLocaleString()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-medium mb-2">输入提示:</h3>
          <div className="bg-muted p-4 rounded-md whitespace-pre-wrap text-sm">
            {record.prompt}
          </div>
        </div>
        
        <Tabs defaultValue="response">
          <TabsList>
            <TabsTrigger value="response">模型响应</TabsTrigger>
            {record.responseThinking && (
              <TabsTrigger value="thinking">思考过程</TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="response" className="mt-2">
            <div className="bg-muted p-4 rounded-md whitespace-pre-wrap text-sm">
              {record.responseContent}
            </div>
          </TabsContent>
          {record.responseThinking && (
            <TabsContent value="thinking" className="mt-2">
              <div className="bg-muted p-4 rounded-md whitespace-pre-wrap text-sm">
                {record.responseThinking}
              </div>
            </TabsContent>
          )}
        </Tabs>
        
        <div className="border-t pt-4">
          <div className="text-sm text-muted-foreground">
            <p>请求哈希: {record.requestHash}</p>
            {record.userId && <p>用户ID: {record.userId}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
