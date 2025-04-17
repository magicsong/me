import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { generateAISummary } from '@/lib/langchain/ai-summary-generator';
import { createAiInsight, updateAiInsight } from '@/lib/db/ai-insight';
import { insightKind } from '@../../lib/db/schema';
import { sub, parseISO } from 'date-fns';

// 将summaryType映射到insightKind
const summaryTypeToInsightKind = {
    'daily': 'daily_summary',
    'three_day': 'three_day_summary',
    'weekly': 'weekly_summary'
} as const;

// 用于生成一句话总结的API
export async function POST(request: NextRequest) {
    try {
        // 权限检查
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: '未授权：需要用户登录' }, { status: 401 });
        }

        // 解析请求内容
        const { dateStr, summaryType = 'daily' } = await request.json();
        console.log('Received dateStr:', dateStr, 'and summaryType:', summaryType);
        if (!dateStr) {
            return NextResponse.json({ error: '缺少必要的参数' }, { status: 400 });
        }

        const kind = summaryTypeToInsightKind[summaryType] || 'daily_summary';
        const userId = session.user.id;
        const currentDate = parseISO(dateStr);

        // 设置时间范围
        let periodStart, periodEnd;
        switch (summaryType) {
            case 'three_day':
                periodStart = sub(currentDate, { days: 2 }); // 过去3天(包括今天)
                periodEnd = currentDate;
                break;
            case 'weekly':
                periodStart = sub(currentDate, { days: 6 }); // 过去7天(包括今天)
                periodEnd = currentDate;
                break;
            default: // daily
                periodStart = currentDate;
                periodEnd = currentDate;
                break;
        }

        // 调用AI生成总结，内部会自动从数据库获取需要的数据
        const summaryResult = await generateAISummary(dateStr, userId, summaryType);

        // 将生成的总结保存到ai-insight
        try {
            // Generate a meaningful title based on summary type and date range
            let title = "";
            if (summaryType === 'daily') {
                title = `Daily Summary: ${currentDate.toLocaleDateString()}`;
            } else if (summaryType === 'three_day') {
                title = `3-Day Summary: ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`;
            } else if (summaryType === 'weekly') {
                title = `Weekly Summary: ${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`;
            }

            await createAiInsight(
                {
                    user_id: userId,
                    kind,
                    time_period_start: periodStart,
                    time_period_end: periodEnd,
                    content: summaryResult.summary,
                    title: title,
                    metadata: {
                        generated_at: new Date().toISOString(),
                        referenced_data: summaryResult.referencedData
                    }
                }
            );
        } catch (dbError) {
            console.error('保存到ai-insight失败:', dbError);
            return NextResponse.json(
                { error: '保存总结失败', details: dbError instanceof Error ? dbError.message : String(dbError) },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            aiSummary: summaryResult.summary,
            referencedData: summaryResult.referencedData
        });
    } catch (error) {
        console.error('AI总结生成失败:', error);
        return NextResponse.json(
            { error: '处理请求时发生错误', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}

