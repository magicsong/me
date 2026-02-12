CREATE TYPE "public"."tag_category" AS ENUM('decision_type', 'domain_type', 'work_nature');--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "category" "tag_category";--> statement-breakpoint
CREATE INDEX "categoryIdx" ON "tags" USING btree ("category");