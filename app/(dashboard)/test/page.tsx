import ChatUI from "@/components/ChatUI";

export default function ChatTestPage() {
  const [sessionId, setSessionId] = useState(`session-${Date.now()}`);
  const [memoryType, setMemoryType] = useState<"buffer" | "window" | "summary">("buffer");
  
  const resetSession = () => {
    setSessionId(`session-${Date.now()}`);
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">LangChain 聊天记忆测试</h1>
      
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">记忆类型:</label>
        <div className="flex space-x-4">
          {[
            { value: "buffer", label: "缓冲记忆" },
            { value: "window", label: "窗口记忆" },
            { value: "summary", label: "摘要记忆" }
          ].map((type) => (
            <label key={type.value} className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio"
                value={type.value}
                checked={memoryType === type.value}
                onChange={() => setMemoryType(type.value as any)}
              />
              <span className="ml-2">{type.label}</span>
            </label>
          ))}
        </div>
      </div>
      
      <div className="mb-6">
        <button
          onClick={resetSession}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
        >
          重置会话
        </button>
        <span className="ml-3 text-sm text-gray-500">当前会话ID: {sessionId}</span>
      </div>
      
      <ChatUI 
        userId="test-user" 
        sessionId={sessionId} 
        memoryType={memoryType}
      />
    </div>
  );
}
