import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { createAiInsight } from '@/lib/db/ai-insight';
import { generateDailyQuote } from '@/lib/langchain/daily-quote-generator';
import { parseISO } from 'date-fns';

// 用于生成每日格言的API
export async function POST(request: NextRequest) {
    try {
        // 权限检查
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: '未授权：需要用户登录' }, { status: 401 });
        }

        // 解析请求内容
        const { dateStr } = await request.json();
        console.log('Received dateStr for daily quote:', dateStr);
        if (!dateStr) {
            return NextResponse.json({ error: '缺少日期参数' }, { status: 400 });
        }

        const userId = session.user.id;
        const currentDate = parseISO(dateStr);

        // 调用AI生成每日格言
        const quoteResult = await generateDailyQuote(dateStr, userId);

        // 将生成的格言保存到ai-insight
        try {
            const title = `每日格言: ${currentDate.toLocaleDateString()}`;
            
            await createAiInsight(
                {
                    user_id: userId,
                    kind: 'daily_quote', // 需要确保schema中添加了这个类型
                    time_period_start: currentDate,
                    time_period_end: currentDate,
                    content: quoteResult.quote,
                    title: title,
                    metadata: {
                        generated_at: new Date().toISOString(),
                        theme: quoteResult.theme,
                        author: quoteResult.author || 'AI生成'
                    }
                }
            );
        } catch (dbError) {
            console.error('保存每日格言失败:', dbError);
            return NextResponse.json(
                { error: '保存格言失败', details: dbError instanceof Error ? dbError.message : String(dbError) },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            dailyQuote: quoteResult.quote,
            author: quoteResult.author,
            theme: quoteResult.theme
        });
    } catch (error) {
        console.error('每日格言生成失败:', error);
        return NextResponse.json(
            { error: '处理请求时发生错误', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
