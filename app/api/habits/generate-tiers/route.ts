import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getHabitByIdDB, createHabitTierInDB } from '@/lib/db/db-habit';
import { generateText } from 'ai';
import { defaultModel } from '@/lib/ai/models';


// 生成习惯挑战阶梯的API
export async function POST(request: Request) {
    try {
        // 身份验证
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: '未授权访问' },
                { status: 401 }
            );
        }

        const userId = session.user.id;

        // 解析请求体
        const body = await request.json();
        const { habitId } = body;

        if (!habitId) {
            return NextResponse.json(
                { error: '缺少习惯ID' },
                { status: 400 }
            );
        }

        // 获取习惯详情
        const habit = await getHabitByIdDB(Number(habitId), userId);
        if (!habit) {
            return NextResponse.json(
                { error: '习惯不存在' },
                { status: 404 }
            );
        }


        // 准备提示信息
        const prompt = `
    请为以下习惯设计三个不同难度级别的挑战阶梯，从简单到困难。每个阶梯需要包含：
    1. 名称
    2. 难度级别（1-3，1最简单）
    3. 详细描述
    4. 奖励点数（简单10-20，中等30-40，困难50-70）

    习惯名称：${habit.name}
    习惯描述：${habit.description || '无描述'}
    类别：${habit.category || '无类别'}
    频率：${habit.frequency}

    请以JSON格式返回三个挑战阶梯，不要包含任何其他说明文字。格式例子：
    [
      {
        "name": "入门级挑战",
        "level": 1,
        "description": "详细描述...",
        "reward_points": 15
      },
      {
        "name": "进阶级挑战",
        "level": 2,
        "description": "详细描述...",
        "reward_points": 35
      },
      {
        "name": "大师级挑战",
        "level": 3,
        "description": "详细描述...",
        "reward_points": 60
      }
    ]
    `;
        // 检查环境变量是否存在
        const aiResponse = await generateText({
            model: defaultModel,
            prompt,
            temperature: 0.7
        });

        const content = aiResponse.text;

        // 解析JSON响应
        let tiers;
        try {
            tiers = JSON.parse(content);
        } catch (e) {
            // 如果解析失败，尝试提取JSON部分
            const jsonMatch = content.match(/\[[\s\S]*?\]/);
            if (jsonMatch) {
                tiers = JSON.parse(jsonMatch[0]);
            } else {
                return NextResponse.json(
                    { error: '无法解析AI回复的JSON格式' },
                    { status: 500 }
                );
            }
        }

        // 创建挑战阶梯
        const results = [];
        for (const tier of tiers) {
            const result = await createHabitTierInDB(
                Number(habitId),
                userId,
                {
                    name: tier.name,
                    level: tier.level,
                    description: tier.description,
                    reward_points: tier.reward_points,
                    completion_criteria: {}
                }
            );
            results.push(result);
        }

        return NextResponse.json({
            success: true,
            tiers: results
        });

    } catch (error: any) {
        console.error('生成习惯挑战失败:', error);
        return NextResponse.json(
            { error: error.message || '生成习惯挑战失败' },
            { status: 500 }
        );
    }
}
