ALTER TABLE "todos" ADD COLUMN "parent_id" integer;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "is_large_task" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "todos" ADD CONSTRAINT "todos_parent_id_todos_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."todos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_todos_parent_id" ON "todos" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_todos_user_parent" ON "todos" USING btree ("user_id","parent_id");