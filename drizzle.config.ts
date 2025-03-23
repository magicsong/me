import { defineConfig } from "drizzle-kit";
export default defineConfig({
  dialect: "postgresql",
  schema: "./iac/drizzle/schema.ts",
  dbCredentials: {
    url: process.env.DATABASE_URL!, // 你的数据库连接地址
  },
});