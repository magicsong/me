import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { daily_summaries } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

/**
 * GET /api/daily-summary/history-today
 * 
 * 获取历史上今天（相同月日）的日汇总数据
 * 
 * 查询参数:
 * - monthDay: MM-dd 格式的月日 (例如: 02-11)
 * - userId: 用户ID
 * - limit: 返回的记录数限制 (默认值: 10)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const monthDay = searchParams.get('monthDay');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (!monthDay || !userId) {
      return NextResponse.json(
        { error: 'monthDay 和 userId 参数是必需的' },
        { status: 400 }
      );
    }

    // 验证 monthDay 格式 MM-dd
    if (!/^\d{2}-\d{2}$/.test(monthDay)) {
      return NextResponse.json(
        { error: 'monthDay 格式应为 MM-dd (例如: 02-11)' },
        { status: 400 }
      );
    }

    // 使用 Drizzle ORM 查询数据库
    // 获取与指定月日相同的所有历史记录
    const summaries = await db
      .select()
      .from(daily_summaries)
      .where(
        and(
          eq(daily_summaries.user_id, userId),
          sql`TO_CHAR(${daily_summaries.date}::date, 'MM-dd') = ${monthDay}`,
          eq(daily_summaries.summary_type, 'daily')
        )
      )
      .orderBy(desc(daily_summaries.date))
      .limit(limit);

    // 格式化数据，提取所需字段
    const formattedData = summaries.map((row) => {
      let content: any = {};
      
      // 解析 content JSON
      try {
        if (typeof row.content === 'string') {
          content = JSON.parse(row.content);
        } else {
          content = row.content || {};
        }
      } catch (e) {
        console.error('Failed to parse content:', e);
      }

      // 提取日期信息
      const dateStr = row.date;
      const dateObj = new Date(dateStr);
      const year = dateObj.getFullYear();

      return {
        date: row.date,
        year,
        score: extractScore(content), // 完成分数 0-10
        mood: extractMood(content), // 心情表情或描述
        energy: extractEnergy(content), // 精力状态
        summary: extractSummary(content), // 摘要
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    console.error('获取历史数据失败:', error);
    return NextResponse.json(
      { error: '获取数据失败，请稍后重试' },
      { status: 500 }
    );
  }
}

/**
 * 从 content 对象中提取完成分数
 */
function extractScore(content: any): number {
  if (!content) return 0;

  const scoreFields = ['completionScore', 'completionRate', 'score', 'rating'];
  
  for (const field of scoreFields) {
    if (content[field] !== undefined && content[field] !== null) {
      const value = parseFloat(String(content[field]));
      if (!isNaN(value)) {
        // 如果是百分比，需要转换为 0-10 的分数
        if (value > 10) {
          return Math.round(value / 10);
        }
        return Math.round(value);
      }
    }
  }

  return 0;
}

/**
 * 从 content 对象中提取心情
 */
function extractMood(content: any): string {
  if (!content) return '';

  const moodFields = ['mood', 'moodEmoji', 'emotion', 'feeling'];
  
  for (const field of moodFields) {
    if (content[field]) {
      return String(content[field]);
    }
  }

  return '';
}

/**
 * 从 content 对象中提取精力状态
 */
function extractEnergy(content: any): string {
  if (!content) return '';

  const energyFields = ['energyLevel', 'energy', 'fatigue', 'vitality'];
  
  for (const field of energyFields) {
    if (content[field]) {
      return String(content[field]);
    }
  }

  return '';
}

/**
 * 从 content 对象中提取摘要
 */
function extractSummary(content: any): string {
  if (!content) return '';

  // 尝试多个可能的字段
  const summaryFields = [
    'summary',
    'dailySummary',
    'mainThoughts',
    'highlight',
    'keyTakeaway',
    'aiSummary',
  ];

  for (const field of summaryFields) {
    if (content[field]) {
      const value = content[field];
      // 如果是数组，取第一个元素；如果是字符串，直接返回
      if (Array.isArray(value) && value.length > 0) {
        return truncate(value[0]);
      }
      if (typeof value === 'string') {
        return truncate(value);
      }
    }
  }

  // 如果没有找到特定的摘要字段，尝试组合其他信息
  const parts = [];
  
  if (content.goodThings && Array.isArray(content.goodThings) && content.goodThings.length > 0) {
    parts.push(content.goodThings[0]);
  }
  
  if (content.learnings && Array.isArray(content.learnings) && content.learnings.length > 0 && parts.length === 0) {
    parts.push(content.learnings[0]);
  }
  
  if (content.challenges && Array.isArray(content.challenges) && content.challenges.length > 0 && parts.length === 0) {
    parts.push(content.challenges[0]);
  }

  return parts.length > 0 ? truncate(parts.join(' · ')) : '有所成长的一天';
}

/**
 * 截断字符串到最大长度
 */
function truncate(text: string, maxLength: number = 60): string {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}
