"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Quote } from "lucide-react";

interface QuoteResponse {
  content: string;
  thinking?: string;
}

export function DailyQuote({ model = process.env.OPENAI_MODEL}) {
  const [quote, setQuote] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [thinking, setThinking] = useState<string>("");
  const [showThinking, setShowThinking] = useState<boolean>(false);

  useEffect(() => {
    async function fetchQuote() {
      try {
        const response = await fetch("/api/llm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: "请给我一句鼓舞人心的日常推荐语录，简短有力，不需要解释，如果有出处，就注明出处，如果没有就不要有其他的话",
            enableThinking: true,
            temperature: 0.8,
            model: model,
            cacheTimeMinutes: 60,
          }),
        });

        if (!response.ok) {
          throw new Error("获取推荐语录失败");
        }

        const data: QuoteResponse = await response.json();
        setQuote(data.content);
        if (data.thinking) {
          setThinking(data.thinking);
        }
      } catch (error) {
        console.error("获取推荐语录错误:", error);
        setQuote("今天的挑战是明天的机遇。");
      } finally {
        setLoading(false);
      }
    }

    fetchQuote();
  }, [model]);

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 shadow-sm hover:shadow-md transition-shadow duration-300">
      <CardContent className="pt-6 pb-4">
        {loading ? (
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-4 bg-slate-200 rounded w-3/4 mb-2.5"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start">
              <Quote className="h-5 w-5 mr-2 text-blue-500 mt-1 flex-shrink-0" />
              <p className="text-gray-800 font-medium leading-relaxed">{quote}</p>
            </div>
            
            {thinking && (
              <div className="mt-2">
                <button 
                  onClick={() => setShowThinking(!showThinking)}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  {showThinking ? "隐藏思考过程" : "查看思考过程"}
                </button>
                
                {showThinking && (
                  <div className="mt-2 p-2 bg-gray-50 rounded-md border border-gray-200 text-xs text-gray-600">
                    <p className="font-mono">{thinking}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
