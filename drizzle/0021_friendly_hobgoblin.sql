ALTER TABLE "pomodoro_tags" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "pomodoro_tags" CASCADE;--> statement-breakpoint
ALTER TABLE "pomodoro_tag_relations" DROP CONSTRAINT IF EXISTS "pomodoro_tag_relations_tag_id_pomodoro_tags_id_fk";
--> statement-breakpoint
ALTER TABLE "pomodoros" ADD COLUMN "todo_id" integer;--> statement-breakpoint
ALTER TABLE "pomodoro_tag_relations" ADD CONSTRAINT "pomodoro_tag_relations_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pomodoros" ADD CONSTRAINT "pomodoros_todo_id_todos_id_fk" FOREIGN KEY ("todo_id") REFERENCES "public"."todos"("id") ON DELETE no action ON UPDATE no action;