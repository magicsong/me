import { NextRequest, NextResponse } from 'next/server';
import { callLLMOnce } from '@/lib/langchain/chains';
import { TodoPromptBuilder } from '../prompt';
import { trimLLMContentToJsonObject } from '@/lib/langchain/utils';
import { TodoApiHandler } from '../handler';
import { FilterOptions } from '../../lib/types';
import { getCurrentUserId } from '@/lib/utils';
import { TodoBO } from "@/app/api/types";

const handler = TodoApiHandler.create();

export async function POST(req: NextRequest) {
    try {
        // 解析请求体
        const body = await req.json();
        const { userPrompt, timeRange } = body;
        const userId = await getCurrentUserId();
        if (!userPrompt) {
            return NextResponse.json(
                { success: false, error: '必须提供userPrompt参数' },
                { status: 400 }
            );
        }

        // 获取今天的日期范围
        const today = new Date();
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        // 构建过滤条件获取今天的待办事项
        const filter: FilterOptions = {
            conditions: [
                {
                    field: "plannedDate",
                    operator: "gte",
                    value: startOfDay.toISOString()
                },
                {
                    field: "plannedDate",
                    operator: "lte",
                    value: endOfDay.toISOString()
                }
            ],
            limit: 100 // 限制最多获取100条任务
        };

        // 获取今天的待办事项
        const todayTasksResult = await handler.getWithFilters(filter, userId);
        const todayTasks = todayTasksResult.items.map(item => {
            const { id, description, title, priority, tags, plannedStartTime } = item as TodoBO;
            return { id, description, title, priority, tags, plannedStartTime };
        });

        // 创建提示构建器
        const promptBuilder = new TodoPromptBuilder();
        const planPrompt = promptBuilder.buildPlanPrompt();

        // 准备上下文信息
        const context = {
            userPrompt: userPrompt,
            todayTasks: todayTasks,
            timeRange: timeRange || "08:00-22:00"
        };
        console.log(context);
        // 生成缓存键
        const cacheKey = `todo-planner-${userId || 'anonymous'}-${Date.now()}`;

        // 调用AI生成规划
        const llmResponse = await callLLMOnce(planPrompt, context, cacheKey);

        // 解析AI响应
        let planResult;
        try {
            planResult = trimLLMContentToJsonObject(llmResponse.content as string);
        } catch (error) {
            return NextResponse.json(
                {
                    success: false,
                    error: '无法解析AI生成的规划结果',
                    rawResponse: llmResponse.content
                },
                { status: 500 }
            );
        }

        // 返回结果
        return NextResponse.json({
            success: true,
            data: JSON.parse(planResult),
            todoCount: todayTasks.length
        });
    } catch (error) {
        console.error('计划生成失败:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : '任务规划生成失败'
            },
            { status: 500 }
        );
    }
}
