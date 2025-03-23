ALTER TABLE "habits" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "habits" ADD COLUMN "reward_points" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "habits" ADD COLUMN "status" "status" DEFAULT 'active' NOT NULL;