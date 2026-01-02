import { db } from "..";
import { eq } from "drizzle-orm";
import { feed_follows, feeds, users } from "../schema";

export async function createFeedFollow(feedId: string, actorId: string) {
  const [newFeedFollow] = await db
    .insert(feed_follows)
    .values({
      feed_id: feedId,
      user_id: actorId,
    })
    .returning();

  // Inner join with feeds and users tables to get the full data
  const result = await db
    .select({
      feed_follow_id: feed_follows.id,
      feed_follow_created_at: feed_follows.createdAt,
      feed_follow_updated_at: feed_follows.updatedAt,
      feed_id: feeds.id,
      feed_name: feeds.name,
      feed_url: feeds.url,
      user_id: users.id,
      user_name: users.name,
    })
    .from(feed_follows)
    .innerJoin(feeds, eq(feed_follows.feed_id, feeds.id))
    .innerJoin(users, eq(feed_follows.user_id, users.id))
    .where(eq(feed_follows.id, newFeedFollow.id))
    .limit(1);

  return result[0];
}

export async function getFeedFollowsForUser(userId: string) {
  const result = await db
    .select()
    .from(feed_follows)
    .innerJoin(feeds, eq(feed_follows.feed_id, feeds.id))
    .where(eq(feed_follows.user_id, userId))
    .innerJoin(users, eq(feed_follows.user_id, users.id))
    .orderBy(feeds.name);
  return result;
}
