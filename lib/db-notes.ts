import { db } from './db';
import { eq, and, ilike, or, desc, asc } from 'drizzle-orm';
import { notes, tags, notesTags } from '../lib/db/schema';

// 笔记查询选项接口
interface NoteQueryOptions {
  userId: string;
  search?: string;
  category?: string;
  tag?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

// 获取所有笔记
export async function getAllNotes(options: NoteQueryOptions) {
  const { userId, search, category, tag, sortBy = 'updatedAt', order = 'desc' } = options;
  
  let query = db.select({
    note: notes,
    tags: tags,
  })
  .from(notes)
  .leftJoin(notesTags, eq(notes.id, notesTags.noteId))
  .leftJoin(tags, eq(notesTags.tagId, tags.id))
  .where(eq(notes.userId, userId));
  
  // 添加搜索条件
  if (search) {
    query = query.where(
      or(
        ilike(notes.title, `%${search}%`),
        ilike(notes.content, `%${search}%`)
      )
    );
  }
  
  // 添加分类筛选
  if (category) {
    query = query.where(eq(notes.category, category));
  }
  
  // 添加标签筛选
  if (tag) {
    query = query.where(eq(tags.name, tag));
  }
  
  // 添加排序
  const orderBy = sortBy === 'createdAt' ? notes.createdAt
    : sortBy === 'updatedAt' ? notes.updatedAt
    : sortBy === 'title' ? notes.title
    : notes.updatedAt;
  
  const orderDirection = order === 'asc' ? asc(orderBy) : desc(orderBy);
  query = query.orderBy(orderDirection);
  
  const result = await query;
  
  // 处理结果，将相同笔记的标签进行分组
  const notesMap = new Map();
  result.forEach(row => {
    const note = row.note;
    
    if (!notesMap.has(note.id)) {
      notesMap.set(note.id, {
        ...note,
        tags: row.tags ? [row.tags] : []
      });
    } else if (row.tags) {
      notesMap.get(note.id).tags.push(row.tags);
    }
  });
  
  return Array.from(notesMap.values());
}

// 根据ID获取笔记
export async function getNoteById(id: number) {
  const result = await db.select({
    note: notes,
    tags: tags,
  })
  .from(notes)
  .leftJoin(notesTags, eq(notes.id, notesTags.noteId))
  .leftJoin(tags, eq(notesTags.tagId, tags.id))
  .where(eq(notes.id, id));
  
  if (result.length === 0) {
    return null;
  }
  
  // 处理笔记和标签
  const note = result[0].note;
  const noteTags = result
    .filter(row => row.tags)
    .map(row => row.tags);
  
  return {
    ...note,
    tags: noteTags
  };
}

// 创建笔记
export async function createNote(data: any) {
  const { title, content, category, tags: tagNames, userId } = data;
  
  // 在事务中创建笔记和标签
  return await db.transaction(async (tx) => {
    // 创建笔记
    const [newNote] = await tx.insert(notes)
      .values({
        title,
        content,
        category,
        userId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    // 处理标签
    if (tagNames && tagNames.length > 0) {
      // 为每个标签创建或查找并关联到笔记
      for (const tagName of tagNames) {
        // 查找标签是否存在
        let tag = await tx.select()
          .from(tags)
          .where(and(eq(tags.name, tagName), eq(tags.userId, userId)))
          .limit(1);
        
        let tagId;
        if (tag.length === 0) {
          // 创建新标签
          const [newTag] = await tx.insert(tags)
            .values({ name: tagName, userId })
            .returning();
          tagId = newTag.id;
        } else {
          tagId = tag[0].id;
        }
        
        // 关联笔记和标签
        await tx.insert(notesTags)
          .values({ noteId: newNote.id, tagId })
          .onConflictDoNothing();
      }
    }
    
    // 返回笔记及其标签
    const noteWithTags = await getNoteById(newNote.id);
    return noteWithTags;
  });
}

// 更新笔记
export async function updateNote(id: number, data: any) {
  const { title, content, category, tags: tagNames, userId } = data;
  
  return await db.transaction(async (tx) => {
    // 更新笔记基本信息
    const [updatedNote] = await tx.update(notes)
      .set({
        ...(title && { title }),
        ...(content && { content }),
        ...(category && { category }),
        updatedAt: new Date()
      })
      .where(eq(notes.id, id))
      .returning();
    
    // 处理标签
    if (tagNames) {
      // 删除所有现有的标签关联
      await tx.delete(notesTags).where(eq(notesTags.noteId, id));
      
      // 添加新的标签关联
      for (const tagName of tagNames) {
        // 查找标签是否存在
        let tag = await tx.select()
          .from(tags)
          .where(and(eq(tags.name, tagName), eq(tags.userId, userId)))
          .limit(1);
        
        let tagId;
        if (tag.length === 0) {
          // 创建新标签
          const [newTag] = await tx.insert(tags)
            .values({ name: tagName, userId })
            .returning();
          tagId = newTag.id;
        } else {
          tagId = tag[0].id;
        }
        
        // 关联笔记和标签
        await tx.insert(notesTags)
          .values({ noteId: id, tagId })
          .onConflictDoNothing();
      }
    }
    
    // 返回更新后的笔记
    const noteWithTags = await getNoteById(id);
    return noteWithTags;
  });
}

// 删除笔记
export async function deleteNote(id: number) {
  return await db.transaction(async (tx) => {
    // 先删除关联的标签
    await tx.delete(notesTags).where(eq(notesTags.noteId, id));
    
    // 再删除笔记
    return await tx.delete(notes).where(eq(notes.id, id));
  });
}
