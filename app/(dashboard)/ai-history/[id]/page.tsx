import { Metadata } from "next";
import Link from "next/link";
import LlmInteractionDetail from "@/components/ai/LlmInteractionDetail";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

interface AIHistoryDetailPageProps {
  params: {
    id: string;
  };
}

export const metadata: Metadata = {
  title: "AI交互详情",
  description: "查看AI模型交互的详细信息",
};

export default function AIHistoryDetailPage({ params }: AIHistoryDetailPageProps) {
  const id = parseInt(params.id);

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/ai-history">
            <ChevronLeft className="mr-2 h-4 w-4" />
            返回历史列表
          </Link>
        </Button>
      </div>

      <LlmInteractionDetail id={id} />
    </div>
  );
}
