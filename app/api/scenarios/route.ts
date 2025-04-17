import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/pool';
import { scenarios } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// 获取用户所有情景
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

        // 获取该用户的所有情景
        const userScenarios = await db.select()
            .from(scenarios)
            .where(eq(scenarios.user_id, userId));

        return NextResponse.json(userScenarios);
    } catch (error: any) {
        console.error('获取情景失败:', error);
        return NextResponse.json(
            { error: error.message || '获取情景失败' },
            { status: 500 }
        );
    }
}

// 创建新情景
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

        // 解析请求体
        const body = await request.json();
        const { name, description, icon, color } = body;

        if (!name) {
            return NextResponse.json(
                { error: '情景名称不能为空' },
                { status: 400 }
            );
        }

        // 创建新情景
        const result = await db.insert(scenarios).values({
            name,
            description: description || null,
            user_id: session.user.id,
            icon: icon || null,
            color: color || null
        }).returning();

        return NextResponse.json(result[0]);
    } catch (error: any) {
        console.error('创建情景失败:', error);
        return NextResponse.json(
            { error: error.message || '创建情景失败' },
            { status: 500 }
        );
    }
}

// 更新情景
export async function PUT(request: Request) {
    try {
        // 验证用户身份
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: '未授权访问' },
                { status: 401 }
            );
        }

        // 解析请求体
        const body = await request.json();
        const { id, name, description, icon, color } = body;

        if (!id || !name) {
            return NextResponse.json(
                { error: '情景ID和名称不能为空' },
                { status: 400 }
            );
        }

        // 确保用户只能更新自己的情景
        const result = await db.update(scenarios)
            .set({
                name,
                description: description || null,
                icon: icon || null,
                color: color || null
            })
            .where(
                and(
                    eq(scenarios.id, id),
                    eq(scenarios.user_id, session.user.id)
                )
            )
            .returning();

        if (result.length === 0) {
            return NextResponse.json(
                { error: '未找到情景或无权限修改' },
                { status: 404 }
            );
        }

        return NextResponse.json(result[0]);
    } catch (error: any) {
        console.error('更新情景失败:', error);
        return NextResponse.json(
            { error: error.message || '更新情景失败' },
            { status: 500 }
        );
    }
}

// 删除情景
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

        // 获取要删除的情景ID
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: '情景ID不能为空' },
                { status: 400 }
            );
        }

        // 确保用户只能删除自己的情景
        const result = await db.delete(scenarios)
            .where(
                and(
                    eq(scenarios.id, parseInt(id)),
                    eq(scenarios.user_id, session.user.id)
                )
            )
            .returning();

        if (result.length === 0) {
            return NextResponse.json(
                { error: '未找到情景或无权限删除' },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, deleted: result[0] });
    } catch (error: any) {
        console.error('删除情景失败:', error);
        return NextResponse.json(
            { error: error.message || '删除情景失败' },
            { status: 500 }
        );
    }
}
