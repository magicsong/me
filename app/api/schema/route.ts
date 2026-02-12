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

    // 检查系统标签是否已存在
    const existingSystemTags = await db
      .select({ id: tags.id })
      .from(tags)
      .where(eq(tags.user_id, SYSTEM_USER_ID))
      .limit(1);

    if (existingSystemTags.length === 0) {
      // 获取预定义标签
      const predefinedTags = getAllPredefinedTags();

      // 批量插入系统标签
      const tagsToInsert = predefinedTags.map((tag) => ({
        name: tag.name,
        color: tag.color,
        category: tag.category,
        user_id: SYSTEM_USER_ID,
        kind: null,
      }));

      await db.insert(tags).values(tagsToInsert);
      console.log(`Inserted ${tagsToInsert.length} system tags!`);
    } else {
      console.log("System tags already exist, skipping initialization!");
    }

    return Response.json({
      message: 'Schema created successfully',
      systemTagsInitialized: existingSystemTags.length === 0,
    });
  } catch (error) {
    console.error('Failed to create schema:', error);
    return Response.json({
      message: 'Failed to create schema',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
