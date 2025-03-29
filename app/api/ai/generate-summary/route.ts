import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { updateAIDailySummary } from '@/lib/db/db-daily-summary';
import { generateAISummary } from '@/lib/langchain/ai-summary-generator';

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

        // 调用AI生成总结，内部会自动从数据库获取需要的数据
        const aiSummary = await generateAISummary(dateStr, session.user.id, summaryType);

        // 将生成的总结保存到数据库
        try {
            await updateAIDailySummary(dateStr, aiSummary, summaryType);
        } catch (dbError) {
            console.error('数据库操作失败:', dbError);
            return NextResponse.json(
                { error: '保存总结失败', details: dbError instanceof Error ? dbError.message : String(dbError) },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            aiSummary
        });
    } catch (error) {
        console.error('AI总结生成失败:', error);
        return NextResponse.json(
            { error: '处理请求时发生错误', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}

