import { db } from "..";
import { eq, sql } from "drizzle-orm";
import { feeds, users } from "../schema";
import { logger } from "../../utils/logger";

export async function createFeed(
  feedName: string,
  url: string,
  user_id: string
) {
  try {
    // Use Drizzle's insert method with returning for proper type safety
    const [result] = await db
      .insert(feeds)
      .values({
        name: feedName,
        url: url,
        user_id: user_id,
        lastFetchedAt: null,
      })
      .returning();

    return result;
  } catch (error) {
    // Add more detailed error information
    logger.error("Detailed error in createFeed:", error);
    throw error;
  }
}

export async function listFeeds() {
  const result = await db
    .select()
    .from(feeds)
    .leftJoin(users, eq(feeds.user_id, users.id));
  return result;
}

export async function getFeedByUrl(
  url: string
): Promise<typeof feeds.$inferSelect | undefined> {
  const [result] = await db.select().from(feeds).where(eq(feeds.url, url));
  return result;
}

export async function markFeedFetched(feedId: string) {
  const result = await db
    .update(feeds)
    .set({
      lastFetchedAt: new Date(),
    })
    .where(eq(feeds.id, feedId))
    .returning();
  return result;
}

export async function getNextFeedToFetch() {
  const result = await db
    .select()
    .from(feeds)
    .orderBy(sql`${feeds.lastFetchedAt} asc nulls first`)
    .limit(1);
  return result;
}
