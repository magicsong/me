ALTER TABLE "todo_tag_relations" DROP CONSTRAINT "todo_tag_relations_tag_id_pomodoro_tags_id_fk";
--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "color" varchar(50);--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "kind" varchar(50);--> statement-breakpoint
DELETE FROM "todo_tag_relations" WHERE "tag_id" NOT IN (SELECT "id" FROM "tags");
--> statement-breakpoint
ALTER TABLE "todo_tag_relations" ADD CONSTRAINT "todo_tag_relations_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;