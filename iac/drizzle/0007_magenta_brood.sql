DO $$ BEGIN
 CREATE TYPE "public"."todo_priority" AS ENUM('low', 'medium', 'high', 'urgent');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."todo_status" AS ENUM('pending', 'in_progress', 'completed', 'archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "todo_pomodoro_relations" (
	"todo_id" integer NOT NULL,
	"pomodoro_id" integer NOT NULL,
	CONSTRAINT "todo_pomodoro_relations_todo_id_pomodoro_id_pk" PRIMARY KEY("todo_id","pomodoro_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "todo_tag_relations" (
	"todo_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "todo_tag_relations_todo_id_tag_id_pk" PRIMARY KEY("todo_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "todos" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "todo_status" DEFAULT 'pending' NOT NULL,
	"priority" "todo_priority" DEFAULT 'medium' NOT NULL,
	"due_date" timestamp with time zone,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "todo_pomodoro_relations" ADD CONSTRAINT "todo_pomodoro_relations_todo_id_todos_id_fk" FOREIGN KEY ("todo_id") REFERENCES "public"."todos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "todo_pomodoro_relations" ADD CONSTRAINT "todo_pomodoro_relations_pomodoro_id_pomodoros_id_fk" FOREIGN KEY ("pomodoro_id") REFERENCES "public"."pomodoros"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "todo_tag_relations" ADD CONSTRAINT "todo_tag_relations_todo_id_todos_id_fk" FOREIGN KEY ("todo_id") REFERENCES "public"."todos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "todo_tag_relations" ADD CONSTRAINT "todo_tag_relations_tag_id_pomodoro_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."pomodoro_tags"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_todos_user_id" ON "todos" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_todos_status" ON "todos" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_todos_due_date" ON "todos" USING btree ("due_date");