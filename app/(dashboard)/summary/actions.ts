import { format } from "date-fns/format";

// 生成AI总结
const generateAISummary = async (currentDate: Date) => {
    // 通过API调用生成AI总结
    const response = await fetch('/api/ai/generate-summary', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            dateStr: format(currentDate, 'yyyy-MM-dd'),
            summaryType: 'daily'
        }),
    });

    if (!response.ok) {
        throw new Error('AI请求失败');
    }

    const result = await response.json()
    if (!result.success) {
        throw new Error(result.error || '生成AI总结失败');
    }
    return result;
};

// 保存日常总结
const saveDailySummary = async (userId: string, dateStr: string, content: any) => {
    const response = await fetch('/api/daily-summary', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            userId,
            date: dateStr,
            content,
            summaryType: 'daily'
        }),
    });

    if (!response.ok) {
        throw new Error('保存总结失败');
    }

    const result = await response.json();
    if (!result.success) {
        throw new Error(result.error || '保存总结失败');
    }
    return result.data;
};

// 保存AI生成的总结
const saveAiSummary = async (id: number, aiSummary: string, aiFeedbackActions?: any) => {
    const response = await fetch(`/api/daily-summary/${id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            aiSummary,
            aiFeedbackActions
        }),
    });

    if (!response.ok) {
        throw new Error('保存AI总结失败');
    }

    const result = await response.json();
    if (!result.success) {
        throw new Error(result.error || '保存AI总结失败');
    }
    return result.data;
};

export { generateAISummary, saveDailySummary, saveAiSummary };