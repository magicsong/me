import { db } from 'lib/db';
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { tags } from 'lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAllPredefinedTags } from 'lib/tag-categories';

export const dynamic = 'force-dynamic';

const SYSTEM_USER_ID = 'system'; // 系统标签的用户ID

export async function GET() {
  try {
    // 执行数据库迁移
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("Migrations applied!");

    // 获取所有预定义标签
    const predefinedTags = getAllPredefinedTags();

    // 获取现有的系统标签
    const existingSystemTags = await db
      .select({ id: tags.id, name: tags.name, category: tags.category })
      .from(tags)
      .where(eq(tags.user_id, SYSTEM_USER_ID));

    // 构建现有标签的查找表 (key: "name:category")
    const existingTagsMap = new Map(
      existingSystemTags.map((tag) => [`${tag.name}:${tag.category}`, tag.id])
    );

    // 筛选出新增的标签（不在existingTagsMap中）
    const tagsToInsert = predefinedTags
      .filter((tag) => !existingTagsMap.has(`${tag.name}:${tag.category}`))
      .map((tag) => ({
        name: tag.name,
        color: tag.color,
        category: tag.category,
        user_id: SYSTEM_USER_ID,
        kind: "todo",
      }));

    // 只有当有新标签时才执行插入
    if (tagsToInsert.length > 0) {
      await db.insert(tags).values(tagsToInsert);
      console.log(`Inserted ${tagsToInsert.length} new system tags!`);
    }

    return Response.json({
      message: 'Schema created successfully',
      existingTagsCount: existingSystemTags.length,
      newTagsInserted: tagsToInsert.length,
      totalTagsCount: existingSystemTags.length + tagsToInsert.length,
    });
  } catch (error) {
    console.error('Failed to create schema:', error);
    return Response.json({
      message: 'Failed to create schema',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
