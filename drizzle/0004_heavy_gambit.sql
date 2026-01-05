CREATE TABLE "post" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"published_at" timestamp,
	"feed_id" uuid,
	CONSTRAINT "post_url_unique" UNIQUE("url")
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "is_admin" SET DATA TYPE boolean;--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_feed_id_feeds_id_fk" FOREIGN KEY ("feed_id") REFERENCES "public"."feeds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feed_id_idx" ON "feed_follows" USING btree ("feed_id");