ALTER TABLE "daily_summaries" ADD COLUMN "ai_summary" text;--> statement-breakpoint
ALTER TABLE "daily_summaries" ADD COLUMN "ai_feedback_actions" jsonb;