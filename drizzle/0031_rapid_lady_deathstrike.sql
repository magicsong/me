CREATE TABLE "remarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_remarks_user_id" ON "remarks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_remarks_entity" ON "remarks" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_remarks_created_at" ON "remarks" USING btree ("created_at");