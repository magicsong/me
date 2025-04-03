// 习惯分析API客户端函数

interface HabitAnalysisParams {
  habitId: string;
  timeRange?: 'day' | 'week' | 'month' | 'year';
  detailLevel?: 'simple' | 'standard' | 'detailed';
  includePersonality?: boolean;
  customPrompt?: string;
}

export async function getHabitAnalysis(params: HabitAnalysisParams) {
  const response = await fetch('/api/habits', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '获取习惯分析失败');
  }

  return response.json();
}
