CREATE TABLE IF NOT EXISTS"global_habit_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"time_range" text NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"overall_completion_rate" numeric(5, 2) NOT NULL,
	"total_check_ins" integer NOT NULL,
	"total_failed" integer NOT NULL,
	"best_habit_id" integer,
	"worst_habit_id" integer,
	"daily_trend" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "habit_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"habit_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"total_check_ins" integer NOT NULL,
	"current_streak" integer NOT NULL,
	"longest_streak" integer NOT NULL,
	"completion_rate" numeric(5, 2) NOT NULL,
	"last_check_in_date" timestamp with time zone,
	"failed_count" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"time_range" text
);
--> statement-breakpoint
ALTER TABLE "global_habit_stats" ADD CONSTRAINT "global_habit_stats_best_habit_id_habits_id_fk" FOREIGN KEY ("best_habit_id") REFERENCES "public"."habits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "global_habit_stats" ADD CONSTRAINT "global_habit_stats_worst_habit_id_habits_id_fk" FOREIGN KEY ("worst_habit_id") REFERENCES "public"."habits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "habit_stats" ADD CONSTRAINT "habit_stats_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_global_stats_user_id" ON "global_habit_stats" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_global_stats_time_range" ON "global_habit_stats" USING btree ("time_range");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_period" ON "global_habit_stats" USING btree ("user_id","time_range","period_start");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_habit_user_idx" ON "habit_stats" USING btree ("habit_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_habit_stats_habit_id" ON "habit_stats" USING btree ("habit_id");--> statement-breakpoint
CREATE INDEX "idx_habit_stats_user_id" ON "habit_stats" USING btree ("user_id");
ALTER TABLE "habit_stats" ADD COLUMN IF NOT EXISTS "time_range" text;