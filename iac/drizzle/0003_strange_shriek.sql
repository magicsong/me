CREATE TABLE IF NOT EXISTS "llm_cache_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_hash" text NOT NULL,
	"prompt" text NOT NULL,
	"model" text NOT NULL,
	"response_content" text NOT NULL,
	"response_thinking" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_llm_cache_records_request_hash" ON "llm_cache_records" USING btree ("request_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_llm_cache_records_created_at" ON "llm_cache_records" USING btree ("created_at");