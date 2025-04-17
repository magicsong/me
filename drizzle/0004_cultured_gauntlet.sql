DO $$ BEGIN
 CREATE TYPE "public"."pomodoro_status" AS ENUM('running', 'completed', 'canceled', 'paused');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pomodoro_tag_relations" (
	"pomodoro_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "pomodoro_tag_relations_pomodoro_id_tag_id_pk" PRIMARY KEY("pomodoro_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pomodoro_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#FF5722' NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pomodoros" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"duration" integer DEFAULT 25 NOT NULL,
	"status" "pomodoro_status" DEFAULT 'running' NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"user_id" text NOT NULL,
	"habit_id" integer,
	"goal_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pomodoro_tag_relations" ADD CONSTRAINT "pomodoro_tag_relations_pomodoro_id_pomodoros_id_fk" FOREIGN KEY ("pomodoro_id") REFERENCES "public"."pomodoros"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pomodoro_tag_relations" ADD CONSTRAINT "pomodoro_tag_relations_tag_id_pomodoro_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."pomodoro_tags"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pomodoros" ADD CONSTRAINT "pomodoros_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pomodoros" ADD CONSTRAINT "pomodoros_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pomodoros_user_id" ON "pomodoros" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pomodoros_status" ON "pomodoros" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pomodoros_start_time" ON "pomodoros" USING btree ("start_time");