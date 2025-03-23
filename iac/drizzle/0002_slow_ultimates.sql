DO $$ BEGIN
 CREATE TYPE "public"."difficulty" AS ENUM('easy', 'medium', 'hard');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "habit_difficulties" (
	"id" serial PRIMARY KEY NOT NULL,
	"habit_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"completed_at" date DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"difficulty" "difficulty" NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "habit_difficulties" ADD CONSTRAINT "habit_difficulties_habit_id_habits_id_fk" FOREIGN KEY ("habit_id") REFERENCES "public"."habits"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_habit_difficulties_habit_id" ON "habit_difficulties" USING btree ("habit_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_habit_difficulties_completed_at" ON "habit_difficulties" USING btree ("completed_at");