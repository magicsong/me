DO $$ BEGIN
 CREATE TYPE "public"."summary_type" AS ENUM('daily', 'three_day', 'weekly');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "daily_summaries" ADD COLUMN "summary_type" "summary_type" DEFAULT 'daily';