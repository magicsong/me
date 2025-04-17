DROP TABLE "products" CASCADE;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "planned_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "planned_start_time" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "planned_end_time" timestamp with time zone;