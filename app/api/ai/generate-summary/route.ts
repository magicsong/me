import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { createOrUpdateDailySummary, updateAIDailySummary } from '@/lib/db/db-daily-summary';
import { generateSummaryFeedback } from '@/lib/langchain/chains';

// 用于生成一句话总结的API
export async function POST(request: NextRequest) {
    try {
        // 权限检查
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: '未授权：需要用户登录' }, { status: 401 });
        }

        // 解析请求内容
        const { context, dateStr } = await request.json();

        if (!context || !dateStr) {
            return NextResponse.json({ error: '缺少必要的参数' }, { status: 400 });
        }

        // 准备AI提示内容
        const prompt = `
    以下是我${dateStr.includes(new Date().toISOString().split('T')[0]) ? '今天' : dateStr}的日常总结：
    完成任务: ${context.completedTasks ? context.completedTasks.join(', ') : '无'}
    三件好事: ${context.goodThings ? context.goodThings.filter(Boolean).join(', ') : '无'}
    今日收获: ${context.learnings || '无'}
    挑战: ${context.challenges || '无'}
    改进点: ${context.improvements || '无'}
    心情: ${context.mood || '无'}
    精力水平: ${context.energyLevel || '无'}
    睡眠质量: ${context.sleepQuality || '无'}
    明日目标: ${context.tomorrowGoals || '无'}
    
    请根据以上信息，用一句话总结我这一天的情况，包括亮点和改进空间，不超过50个字。
    使用客观但鼓励的语气，直接给出总结，不需要"你的总结是"这样的开头。
    `;

        // 调用AI生成总结
        const aiSummary = await generateSummaryFeedback(prompt);

        // 将生成的总结保存到数据库
        try {
            await updateAIDailySummary(dateStr, aiSummary);
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
