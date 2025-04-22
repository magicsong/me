"use client"
import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "ai";
  content: string;
}

interface ChatUIProps {
  userId: string;
  sessionId: string;
  memoryType?: "buffer" | "window" | "summary";
}

export default function ChatUI({ userId, sessionId, memoryType = "buffer" }: ChatUIProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    // 添加用户消息
    const userMessage: Message = { role: "user", content: inputValue };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    
    try {
      // 使用API调用替代直接函数调用
      const response = await fetch('/api/memory-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          sessionId,
          input: inputValue,
          memoryParams: {
            memoryType,
            returnMessages: true,
          },
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API响应错误: ${response.status}`);
      }
      
      const data = await response.json();
      
      // 添加AI消息
      const aiMessage: Message = { role: "ai", content: data.content || data.response };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("生成响应失败:", error);
      const errorMessage: Message = { 
        role: "ai", 
        content: "抱歉，生成响应时发生错误。" 
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto border rounded-lg">
      {/* 聊天头部 */}
      <div className="p-4 border-b bg-gray-50 rounded-t-lg">
        <h2 className="text-lg font-semibold">聊天测试界面</h2>
        <p className="text-sm text-gray-500">
          会话ID: {sessionId} | 记忆类型: {memoryType}
        </p>
      </div>
      
      {/* 消息容器 */}
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-center text-gray-400 my-8">暂无消息</p>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`mb-4 ${
                message.role === "user" ? "text-right" : "text-left"
              }`}
            >
              <div
                className={`inline-block p-3 rounded-lg ${
                  message.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-800"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="text-left mb-4">
            <div className="inline-block p-3 rounded-lg bg-gray-100">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* 输入区域 */}
      <div className="p-4 border-t">
        <div className="flex">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") handleSendMessage();
            }}
            placeholder="输入消息..."
            className="flex-1 p-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-blue-300"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
