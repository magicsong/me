import { NextResponse } from 'next/server';
import { getNoteById, updateNote, deleteNote } from '@/lib/db-notes';
import { getCurrentUserId } from '@/lib/utils';

// 获取单个笔记详情
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: '无效的笔记ID' }, { status: 400 });
    }
    
    // 使用数据库函数获取笔记
    const note = await getNoteById(id);
    
    if (!note) {
      return NextResponse.json({ error: '笔记不存在' }, { status: 404 });
    }
    
    // 验证笔记所有者
    if (note.userId !== userId) {
      return NextResponse.json({ error: '无权访问此笔记' }, { status: 403 });
    }
    
    return NextResponse.json(note);
  } catch (error) {
    console.error('获取笔记出错:', error);
    return NextResponse.json({ error: '获取笔记失败' }, { status: 500 });
  }
}

// 更新单个笔记
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }
    
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: '无效的笔记ID' }, { status: 400 });
    }
    
    // 检查笔记是否存在且属于当前用户
    const existingNote = await getNoteById(id);
    if (!existingNote) {
      return NextResponse.json({ error: '笔记不存在' }, { status: 404 });
    }
    
    if (existingNote.userId !== userId) {
      return NextResponse.json({ error: '无权修改此笔记' }, { status: 403 });
    }
    
    // 解析请求体
    const data = await request.json();
    const { title, content } = data;
    
    // 验证必填字段
    if (!title || !content) {
      return NextResponse.json({ error: '标题和内容不能为空' }, { status: 400 });
    }
    
    // 使用数据库函数更新笔记
    const updatedNote = await updateNote(id, {
      ...data,
      userId
    });
    
    return NextResponse.json(updatedNote);
  } catch (error) {
    console.error('更新笔记出错:', error);
    return NextResponse.json({ error: '更新笔记失败' }, { status: 500 });
  }
}

// 删除单个笔记
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }
    
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ error: '无效的笔记ID' }, { status: 400 });
    }
    
    // 检查笔记是否存在且属于当前用户
    const existingNote = await getNoteById(id);
    if (!existingNote) {
      return NextResponse.json({ error: '笔记不存在' }, { status: 404 });
    }
    
    if (existingNote.userId !== userId) {
      return NextResponse.json({ error: '无权删除此笔记' }, { status: 403 });
    }
    
    // 使用数据库函数删除笔记
    await deleteNote(id);
    
    return NextResponse.json({ success: true, message: '笔记已成功删除' });
  } catch (error) {
    console.error('删除笔记出错:', error);
    return NextResponse.json({ error: '删除笔记失败' }, { status: 500 });
  }
}
