import { NextResponse } from 'next/server';
import { defaultModel } from '@/lib/ai/models';
import { generateObject, generateText } from 'ai';
import { auth } from '@/lib/auth';
import { getHabitByIdDB, getHabitHistoryFromDB } from '@/lib/db/db-habit';
import { trimLLMContentToJsonArray, trimLLMContentToJsonObject } from '@/lib/utils';

// 习惯每日记录类型定义
interface DailyRecord {
    date: string;
    completed: boolean;
    difficulty?: number; // 1-5的难度评分
    feeling?: string;   // 用户对当天完成情况的感受
    comment?: string;     // 附加备注
}

// 习惯数据Context类型定义
interface HabitContext {
    habitId: string;
    habitName: string;
    overallCompletionRate: number; // 0-1的完成率
    streak: number;                // 当前连续完成天数
    maxStreak: number;             // 历史最大连续完成天数
    dailyRecords: DailyRecord[];   // 每日记录
    summary: {
        totalDays: number;           // 总记录天数
        completedDays: number;       // 完成的天数
        averageDifficulty?: number;  // 平均难度
    };
}

// 改为POST方法并增加入参
export async function POST(request: Request) {
    try {
        // 获取当前用户会话
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: '未授权访问' },
                { status: 401 }
            );
        }

        // 解析请求体
        const body = await request.json().catch(() => ({}));

        // 获取入参，并设置默认值
        const {
            timeRange = 'week',           // 时间范围：day, week, month, year
            habitId,                    // 特定习惯的ID列表（必传）
            detailLevel = 'standard',     // 详细程度：simple, standard, detailed
            includePersonality = false,   // 是否包含个性化语言
            customPrompt = '',            // 自定义提示词
        } = body;

        if (!habitId) {
            return NextResponse.json(
                { error: '缺少习惯ID' },
                { status: 400 }
            );
        }

        // 验证timeRange参数
        if (!['day', 'week', 'month', 'year'].includes(timeRange)) {
            return NextResponse.json(
                { error: '无效的时间范围参数' },
                { status: 400 }
            );
        }

        // 获取习惯数据
        const habitsHistory = await getHabitHistoryFromDB(habitId, session.user.id);
        if (!habitsHistory) {
            return NextResponse.json(
                { error: '未找到习惯数据' },
                { status: 404 }
            );
        }

        // 获取习惯基本信息
        const habitInfo = await getHabitByIdDB(habitId, session.user.id);

        if (!habitInfo) {
            return NextResponse.json(
                { error: '未找到习惯信息' },
                { status: 404 }
            );
        }

        // 处理习惯历史数据，构建Context
        const dailyRecords: DailyRecord[] = [];
        let completedDays = 0;
        let totalDifficulty = 0;
        let difficultyCount = 0;
        let currentStreak = 0;
        let maxStreak = 0;

        // 计算时间范围
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let startDate = new Date(today);
        switch (timeRange) {
            case 'day':
                // 只显示今天
                break;
            case 'week':
                // 过去7天
                startDate.setDate(today.getDate() - 6);
                break;
            case 'month':
                // 过去30天
                startDate.setDate(today.getDate() - 29);
                break;
            case 'year':
                // 过去365天
                startDate.setDate(today.getDate() - 364);
                break;
        }

        // 创建日期范围内所有日期的映射
        const dateMap = new Map<string, DailyRecord>();

        // 填充所有日期
        for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD格式
            dateMap.set(dateStr, {
                date: dateStr,
                completed: false // 默认未完成
            });
        }

        // 用实际记录覆盖默认值
        habitsHistory.forEach(record => {
            const dateStr = new Date(record.date).toISOString().split('T')[0];

            // 仅处理时间范围内的记录
            if (dateMap.has(dateStr)) {
                dateMap.set(dateStr, {
                    date: dateStr,
                    completed: record.completed,
                    difficulty: record.difficulty,
                    comment: record.comment
                });
            }
        });

        // 按日期排序
        const sortedDates = Array.from(dateMap.keys()).sort();

        // 处理每日记录
        sortedDates.forEach(dateStr => {
            const record = dateMap.get(dateStr)!;
            dailyRecords.push(record);

            // 计算成功率相关指标
            if (record.completed) {
                completedDays++;
                currentStreak++;

                if (currentStreak > maxStreak) {
                    maxStreak = currentStreak;
                }
            } else {
                currentStreak = 0;
            }

            // 计算难度相关指标
            if (record.difficulty) {
                totalDifficulty += record.difficulty;
                difficultyCount++;
            }
        });

        // 构建习惯Context
        const habitContext: HabitContext = {
            habitId,
            habitName: habitInfo.name,
            overallCompletionRate: dailyRecords.length > 0 ? completedDays / dailyRecords.length : 0,
            streak: habitInfo.streak || currentStreak,
            maxStreak: maxStreak,
            dailyRecords: dailyRecords,
            summary: {
                totalDays: dailyRecords.length,
                completedDays: completedDays,
                averageDifficulty: difficultyCount > 0 ? totalDifficulty / difficultyCount : undefined
            }
        };

        // 根据detailLevel设置适当的模式
        let recommendationCount = 3; // 默认值
        let maxLength = "中等";

        if (detailLevel === 'simple') {
            recommendationCount = 2;
            maxLength = "简短";
        } else if (detailLevel === 'detailed') {
            recommendationCount = 5;
            maxLength = "详细";
        }

        // 构建提示词
        let prompt = `根据用户最近${timeRange === 'day' ? '今天' :
                timeRange === 'week' ? '一周' :
                    timeRange === 'month' ? '一个月' : '一年'
            }的习惯数据生成个性化建议。
    
    习惯详细数据: ${JSON.stringify(habitContext, null, 2)}
    
    请针对用户名为"${habitContext.habitName}"的习惯情况进行分析，生成${maxLength}的建议。
    整体完成率为${(habitContext.overallCompletionRate * 100).toFixed(1)}%，当前连续完成${habitContext.streak}天。
    
    请特别关注用户每天的完成情况、难度评分以及感受。分析用户在哪些情况下容易坚持，哪些情况下容易放弃。
    建议应该具体、实用、积极正面，并基于用户的实际数据。
    ${includePersonality ? '使用更加个性化和激励性的语言。' : '保持语言简洁专业。'}
    
    必须严格按照以下JSON格式输出(不要有markdown标记):
    
    {
      "overview": "总体评价内容",
      "strengths": [
        "优点1",
        "优点2"
      ],
      "improvements": [
        "改进点1",
        "改进点2"
      ],
      "recommendations": [
        {
          "title": "建议1标题",
          "description": "建议1详细内容",
          "actionable": "具体可执行的步骤"
        },
        {
          "title": "建议2标题",
          "description": "建议2详细内容",
          "actionable": "具体可执行的步骤"
        }
      ]
    }
    
    请确保提供${recommendationCount}条具体建议，不要添加任何额外的解释和文字，直接输出有效的JSON。`;
        
        // 添加自定义提示词（如果有）
        if (customPrompt) {
            prompt += `\n\n用户特别要求: ${customPrompt}`;
        }

        // 使用AI生成习惯建议
        const analysisText = await generateText({
            model: defaultModel,
            prompt,
            temperature: includePersonality ? 0.7 : 0.4, // 个性化语言使用稍高的温度
        });

        // 尝试解析JSON响应
        try {
            console.log(analysisText)
            const suggestions = JSON.parse(trimLLMContentToJsonObject(analysisText.text))
            if (!suggestions){
                console.error('AI响应内容:', analysisText);
                return NextResponse.json(
                    { error: 'AI响应格式错误' },
                    { status: 500 }
                );
            }
            return NextResponse.json({
                suggestions,
                meta: {
                    timeRange,
                    habitName: habitContext.habitName,
                    completionRate: habitContext.overallCompletionRate,
                    streak: habitContext.streak,
                    maxStreak: habitContext.maxStreak
                },
                context: habitContext
            });
        } catch (parseError) {
            console.error('解析AI响应失败:', parseError);
            console.error('AI响应内容:', analysisText);
            return NextResponse.json(
                { error: '无法解析AI生成的建议' },
                { status: 500 }
            );
        }

    } catch (error: any) {
        console.error('生成习惯建议时出错:', error);
        return NextResponse.json(
            { error: error.message || '生成习惯建议失败' },
            { status: 500 }
        );
    }
}
