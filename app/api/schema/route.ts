import { db } from 'lib/db';
import { migrate } from "drizzle-orm/node-postgres/migrator";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 从项目中的iac目录读取SQL文件
    await migrate(db, { migrationsFolder: "./iac/drizzle" });
    console.log("Migrations applied!");
    
    return Response.json({
      message: 'Schema created successfully',
    });
  } catch (error) {
    console.error('Failed to create schema:', error);
    return Response.json({
      message: 'Failed to create schema',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
