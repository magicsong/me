import { Suspense } from 'react';
import HabitAnalysis from '../components/HabitAnalysis';

export const metadata = {
  title: '习惯分析 | 习惯养成助手',
  description: '获取关于你的习惯养成的AI个性化分析和建议',
};

export default function AnalysisPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">习惯分析</h1>
      <p className="text-muted-foreground mb-6">
        利用AI分析你的习惯数据，获取个性化的建议和改进方向
      </p>
      
      <Suspense fallback={<div>加载中...</div>}>
        <HabitAnalysis />
      </Suspense>
    </div>
  );
}
