DO $$ BEGIN
 CREATE TYPE "public"."insight_kind" AS ENUM('daily_summary', 'three_day_summary', 'weekly_summary', 'monthly_summary', 'quarterly_summary', 'yearly_summary', 'personal_profile', 'habit_analysis', 'goal_tracking', 'productivity_trend');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_insights" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" "insight_kind" NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"content_json" jsonb,
	"time_period_start" timestamp with time zone NOT NULL,
	"time_period_end" timestamp with time zone NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reference_ids" jsonb DEFAULT '[]'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ai_insights_user_id" ON "ai_insights" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ai_insights_kind" ON "ai_insights" USING btree ("kind");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ai_insights_created_at" ON "ai_insights" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_user_kind_period" ON "ai_insights" USING btree ("user_id","kind","time_period_start","time_period_end");