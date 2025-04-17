ALTER TABLE "habit_difficulties" ALTER COLUMN "completed_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "habit_difficulties" ALTER COLUMN "completed_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "habit_entries" ALTER COLUMN "completed_at" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "habit_entries" ALTER COLUMN "completed_at" SET DEFAULT now();