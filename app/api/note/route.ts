import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllNotes, createNote, updateNote, deleteNote, getNoteById } from '@/lib/db-notes';
import { getCurrentUserId } from '@/lib/utils';

// 获取笔记列表
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权：需要用户登录' }, { status: 401 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const tag = searchParams.get('tag');
    const sortBy = searchParams.get('sortBy') || 'updatedAt';
    const order = searchParams.get('order') || 'desc';
    
    const notes = await getAllNotes({
      userId: session.user.id,
      search: search || undefined,
      category: category || undefined,
      tag: tag || undefined,
      sortBy,
      order
    });
    
    return NextResponse.json(notes);
  } catch (error) {
    console.error('获取笔记失败:', error);
    return NextResponse.json(
      { error: '获取笔记失败', details: error.message },
      { status: 500 }
    );
  }
}

// 创建新笔记
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId()
    if (!userId) {
      return NextResponse.json({ error: '未授权：需要用户登录' }, { status: 401 });
    }
    
    const body = await request.json();
    
    // 验证请求数据
    if (!body.title) {
      return NextResponse.json({ error: '标题不能为空' }, { status: 400 });
    }
    
    if (!body.content) {
      return NextResponse.json({ error: '内容不能为空' }, { status: 400 });
    }
    
    const note = await createNote({
      ...body,
      userId,
    });
    
    return NextResponse.json(note);
  } catch (error) {
    console.error('创建笔记失败:', error);
    return NextResponse.json(
      { error: '创建笔记失败', details: error.message },
      { status: 500 }
    );
  }
}

// 更新笔记
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权：需要用户登录' }, { status: 401 });
    }
    
    const body = await request.json();
    
    // 验证请求数据
    if (!body.id) {
      return NextResponse.json({ error: '笔记ID不能为空' }, { status: 400 });
    }
    
    // 验证笔记所有权
    const existingNote = await getNoteById(body.id);
    if (!existingNote) {
      return NextResponse.json({ error: '笔记不存在' }, { status: 404 });
    }
    
    if (existingNote.userId !== session.user.id) {
      return NextResponse.json({ error: '无权修改他人笔记' }, { status: 403 });
    }
    
    const updatedNote = await updateNote(body.id, body);
    
    return NextResponse.json(updatedNote);
  } catch (error) {
    console.error('更新笔记失败:', error);
    return NextResponse.json(
      { error: '更新笔记失败', details: error.message },
      { status: 500 }
    );
  }
}

// 删除笔记
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权：需要用户登录' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: '笔记ID不能为空' }, { status: 400 });
    }
    
    // 验证笔记所有权
    const existingNote = await getNoteById(parseInt(id));
    if (!existingNote) {
      return NextResponse.json({ error: '笔记不存在' }, { status: 404 });
    }
    
    if (existingNote.userId !== session.user.id) {
      return NextResponse.json({ error: '无权删除他人笔记' }, { status: 403 });
    }
    
    await deleteNote(parseInt(id));
    
    return NextResponse.json({ success: true, message: '笔记已删除' });
  } catch (error) {
    console.error('删除笔记失败:', error);
    return NextResponse.json(
      { error: '删除笔记失败', details: error.message },
      { status: 500 }
    );
  }
}
