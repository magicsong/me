import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/pool';
import { active_scenarios, scenarios } from '@/iac/drizzle/schema';
import { eq, and } from 'drizzle-orm';

// 获取用户当前激活的情景
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

        // 获取用户当前激活的情景
        const activeScenarios = await db
            .select({
                id: active_scenarios.id,
                scenario_id: active_scenarios.scenario_id,
                activated_at: active_scenarios.activated_at,
                scenario_name: scenarios.name,
                scenario_description: scenarios.description,
                scenario_icon: scenarios.icon,
                scenario_color: scenarios.color
            })
            .from(active_scenarios)
            .innerJoin(
                scenarios,
                eq(active_scenarios.scenario_id, scenarios.id)
            )
            .where(
                and(
                    eq(active_scenarios.user_id, userId),
                    eq(active_scenarios.is_active, true)
                )
            );

        return NextResponse.json(activeScenarios);
    } catch (error: any) {
        console.error('获取激活情景失败:', error);
        return NextResponse.json(
            { error: error.message || '获取激活情景失败' },
            { status: 500 }
        );
    }
}

// 激活情景
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
        const { scenario_id } = body;

        if (!scenario_id) {
            return NextResponse.json(
                { error: '情景ID不能为空' },
                { status: 400 }
            );
        }

        // 确保情景存在且属于该用户
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

        // 检查该情景是否已经被激活
        const existingActive = await db
            .select()
            .from(active_scenarios)
            .where(
                and(
                    eq(active_scenarios.scenario_id, scenario_id),
                    eq(active_scenarios.user_id, userId),
                    eq(active_scenarios.is_active, true)
                )
            )
            .limit(1);

        if (existingActive.length > 0) {
            // 情景已经激活，直接返回
            return NextResponse.json({
                success: true,
                message: '情景已激活',
                active_scenario: existingActive[0]
            });
        }

        // 激活情景
        const result = await db.insert(active_scenarios).values({
            scenario_id,
            user_id: userId,
            is_active: true
        }).returning();

        return NextResponse.json({
            success: true,
            active_scenario: result[0]
        });
    } catch (error: any) {
        console.error('激活情景失败:', error);
        return NextResponse.json(
            { error: error.message || '激活情景失败' },
            { status: 500 }
        );
    }
}

// 停用情景
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

        // 获取要停用的情景ID
        const { searchParams } = new URL(request.url);
        const scenario_id = searchParams.get('scenario_id');

        if (!scenario_id) {
            return NextResponse.json(
                { error: '情景ID不能为空' },
                { status: 400 }
            );
        }

        // 更新活跃情景状态
        const result = await db.update(active_scenarios)
            .set({
                is_active: false,
                deactivated_at: new Date()
            })
            .where(
                and(
                    eq(active_scenarios.scenario_id, parseInt(scenario_id)),
                    eq(active_scenarios.user_id, userId),
                    eq(active_scenarios.is_active, true)
                )
            )
            .returning();

        if (result.length === 0) {
            return NextResponse.json(
                { error: '未找到活跃情景或无权限停用' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            deactivated: result[0]
        });
    } catch (error: any) {
        console.error('停用情景失败:', error);
        return NextResponse.json(
            { error: error.message || '停用情景失败' },
            { status: 500 }
        );
    }
}
