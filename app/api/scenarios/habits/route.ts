import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/pool';
import { habit_scenarios, habits, scenarios } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// 获取情景中的所有习惯
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

        // 获取情景ID
        const { searchParams } = new URL(request.url);
        const scenario_id = searchParams.get('scenario_id');

        if (!scenario_id) {
            return NextResponse.json(
                { error: '情景ID不能为空' },
                { status: 400 }
            );
        }

        // 检查该情景是否存在且属于该用户
        const scenarioExists = await db
            .select()
            .from(scenarios)
            .where(
                and(
                    eq(scenarios.id, parseInt(scenario_id)),
                    eq(scenarios.user_id, userId)
                )
            )
            .limit(1);

        if (scenarioExists.length === 0) {
            return NextResponse.json(
                { error: '情景不存在或无权限访问' },
                { status: 404 }
            );
        }

        // 获取情景中的所有习惯
        const scenarioHabits = await db
            .select({
                id: habits.id,
                name: habits.name,
                description: habits.description,
                frequency: habits.frequency,
                category: habits.category,
                reward_points: habits.reward_points,
                created_at: habits.created_at,
                relation_id: habit_scenarios.id
            })
            .from(habit_scenarios)
            .innerJoin(
                habits,
                eq(habit_scenarios.habit_id, habits.id)
            )
            .where(
                and(
                    eq(habit_scenarios.scenario_id, parseInt(scenario_id)),
                    eq(habit_scenarios.user_id, userId)
                )
            );

        return NextResponse.json(scenarioHabits);
    } catch (error: any) {
        console.error('获取情景习惯失败:', error);
        return NextResponse.json(
            { error: error.message || '获取情景习惯失败' },
            { status: 500 }
        );
    }
}

// 添加习惯到情景
export async function POST(request: Request) {
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

        // 解析请求体
        const body = await request.json();
        const { scenario_id, habit_id } = body;

        if (!scenario_id || !habit_id) {
            return NextResponse.json(
                { error: '情景ID和习惯ID不能为空' },
                { status: 400 }
            );
        }

        // 检查该情景是否存在且属于该用户
        const scenarioExists = await db
            .select()
            .from(scenarios)
            .where(
                and(
                    eq(scenarios.id, scenario_id),
                    eq(scenarios.user_id, userId)
                )
            )
            .limit(1);

        if (scenarioExists.length === 0) {
            return NextResponse.json(
                { error: '情景不存在或无权限访问' },
                { status: 404 }
            );
        }

        // 检查该习惯是否存在且属于该用户
        const habitExists = await db
            .select()
            .from(habits)
            .where(
                and(
                    eq(habits.id, habit_id),
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

        // 检查是否已经存在该关联
        const existingRelation = await db
            .select()
            .from(habit_scenarios)
            .where(
                and(
                    eq(habit_scenarios.scenario_id, scenario_id),
                    eq(habit_scenarios.habit_id, habit_id),
                    eq(habit_scenarios.user_id, userId)
                )
            )
            .limit(1);

        if (existingRelation.length > 0) {
            return NextResponse.json({
                success: true,
                message: '该习惯已在情景中',
                relation: existingRelation[0]
            });
        }

        // 添加习惯到情景
        const result = await db.insert(habit_scenarios).values({
            scenario_id,
            habit_id,
            user_id: userId
        }).returning();

        return NextResponse.json({
            success: true,
            relation: result[0]
        });
    } catch (error: any) {
        console.error('添加习惯到情景失败:', error);
        return NextResponse.json(
            { error: error.message || '添加习惯到情景失败' },
            { status: 500 }
        );
    }
}

// 从情景中移除习惯
export async function DELETE(request: Request) {
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

        // 获取参数
        const { searchParams } = new URL(request.url);
        const scenario_id = searchParams.get('scenario_id');
        const habit_id = searchParams.get('habit_id');

        if (!scenario_id || !habit_id) {
            return NextResponse.json(
                { error: '情景ID和习惯ID不能为空' },
                { status: 400 }
            );
        }

        // 删除关联
        const result = await db.delete(habit_scenarios)
            .where(
                and(
                    eq(habit_scenarios.scenario_id, parseInt(scenario_id)),
                    eq(habit_scenarios.habit_id, parseInt(habit_id)),
                    eq(habit_scenarios.user_id, userId)
                )
            )
            .returning();

        if (result.length === 0) {
            return NextResponse.json(
                { error: '未找到关联或无权限删除' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            deleted: result[0]
        });
    } catch (error: any) {
        console.error('从情景中移除习惯失败:', error);
        return NextResponse.json(
            { error: error.message || '从情景中移除习惯失败' },
            { status: 500 }
        );
    }
}
