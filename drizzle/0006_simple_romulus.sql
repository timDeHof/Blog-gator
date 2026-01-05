CREATE INDEX "idx_posts_feed_id" ON "post" USING btree ("feed_id");--> statement-breakpoint
CREATE INDEX "idx_posts_published_at" ON "post" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "idx_posts_feed_id_published_at" ON "post" USING btree ("feed_id","published_at");