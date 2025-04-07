import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/pool';
import { habit_scenarios, habits, scenarios } from '@/iac/drizzle/schema';
import { eq, and } from 'drizzle-orm';

// 获取习惯关联的所有情景
export async function GET(request: Request) {
    try {
        // 验证用户身份
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: '未授权访问' },
                { status: 401 }
            );
        }

        const userId = session.user.id;

        // 获取习惯ID
        const { searchParams } = new URL(request.url);
        const habit_id = searchParams.get('habit_id');

        if (!habit_id) {
            return NextResponse.json(
                { error: '习惯ID不能为空' },
                { status: 400 }
            );
        }

        // 检查该习惯是否存在且属于该用户
        const habitExists = await db
            .select()
            .from(habits)
            .where(
                and(
                    eq(habits.id, parseInt(habit_id)),
                    eq(habits.user_id, userId)
                )
            )
            .limit(1);

        if (habitExists.length === 0) {
            return NextResponse.json(
                { error: '习惯不存在或无权限访问' },
                { status: 404 }
            );
        }

        // 获取习惯关联的所有情景
        const habitScenarios = await db
            .select({
                id: scenarios.id,
                name: scenarios.name,
                description: scenarios.description,
                icon: scenarios.icon,
                color: scenarios.color,
                created_at: scenarios.created_at,
                relation_id: habit_scenarios.id
            })
            .from(habit_scenarios)
            .innerJoin(
                scenarios,
                eq(habit_scenarios.scenario_id, scenarios.id)
            )
            .where(
                and(
                    eq(habit_scenarios.habit_id, parseInt(habit_id)),
                    eq(habit_scenarios.user_id, userId)
                )
            );

        return NextResponse.json(habitScenarios);
    } catch (error: any) {
        console.error('获取习惯关联情景失败:', error);
        return NextResponse.json(
            { error: error.message || '获取习惯关联情景失败' },
            { status: 500 }
        );
    }
}
