import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权：需要用户登录' }, { status: 401 });
    }
    
    const userId = session.user.id;
    
    // 获取笔记总数
    const totalNotes = await prisma.note.count({
      where: { userId }
    });
    
    // 获取唯一分类数
    const categories = await prisma.note.groupBy({
      by: ['category'],
      where: { 
        userId,
        category: { not: null, not: '' }
      }
    });
    
    // 获取唯一标签数
    const tags = await prisma.tag.count({
      where: {
        notes: {
          some: {
            note: {
              userId
            }
          }
        }
      }
    });
    
    return NextResponse.json({
      total: totalNotes,
      categories: categories.length,
      tags: tags
    });
  } catch (error) {
    console.error('获取笔记统计失败:', error);
    return NextResponse.json(
      { error: '获取笔记统计失败', details: error.message },
      { status: 500 }
    );
  }
}
