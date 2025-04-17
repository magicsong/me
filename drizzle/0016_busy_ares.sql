CREATE TABLE IF NOT EXISTS "habit_challenge_tiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"habit_id" integer NOT NULL,
	"name" text NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"description" text,
	"reward_points" integer NOT NULL,
	"completion_criteria" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "habit_entries" ADD COLUMN "tier_id" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "habit_challenge_tiers" ADD CONSTRAINT "habit_challenge_tiers_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_challenge_tiers_habit_id" ON "habit_challenge_tiers" USING btree ("habit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_challenge_tiers_level" ON "habit_challenge_tiers" USING btree ("level");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "habit_entries" ADD CONSTRAINT "habit_entries_tier_id_habit_challenge_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."habit_challenge_tiers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_habit_entries_tier_id" ON "habit_entries" USING btree ("tier_id");