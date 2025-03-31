import { Metadata } from "next";
import LlmHistoryList from "@/components/ai/LlmHistoryList";

export const metadata: Metadata = {
  title: "AI交互历史",
  description: "查看所有AI模型的交互历史记录",
};

export default function AIHistoryPage() {
  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">AI交互历史</h1>
      </div>

      <LlmHistoryList />
    </div>
  );
}
