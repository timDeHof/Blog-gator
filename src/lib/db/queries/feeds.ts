import { db } from "..";
import { eq, sql, lt } from "drizzle-orm";
import { feeds, users } from "../schema";

/**
 * Create a new feed record for a user.
 *
 * @param feedName - The display name of the feed
 * @param url - The feed's URL
 * @param user_id - The ID of the user who will own the feed
 * @returns The newly inserted feed row
 */
export async function createFeed(
  feedName: string,
  url: string,
  user_id: string
) {
  const [result] = await db
    .insert(feeds)
    .values({
      name: feedName,
      url,
      user_id,
      lastFetchedAt: null,
    })
    .returning();

  return result;
}

export async function listFeeds() {
  const result = await db
    .select()
    .from(feeds)
    .leftJoin(users, eq(feeds.user_id, users.id));
  return result;
}

/**
 * Retrieves a feed record that matches the given URL.
 *
 * @param url - The feed's URL to lookup
 * @returns The matching feed row if found, `undefined` otherwise
 */
export async function getFeedByUrl(
  url: string
): Promise<typeof feeds.$inferSelect | undefined> {
  const [result] = await db.select().from(feeds).where(eq(feeds.url, url));
  return result;
}

/**
 * Set a feed's `lastFetchedAt` timestamp to the current time.
 *
 * @param feedId - The ID of the feed to mark as fetched
 * @returns The updated feed row(s) after the timestamp change
 */
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

/**
 * Selects the next feed to fetch, prioritizing feeds that have never been fetched.
 *
 * @returns An array containing at most one feed row ordered by `lastFetchedAt` ascending with nulls first; empty if no feeds exist.
 */
export async function getNextFeedToFetch() {
  const result = await db
    .select()
    .from(feeds)
    .orderBy(sql`${feeds.lastFetchedAt} asc nulls first`)
    .limit(1);
  return result;
}

/**
 * Selects a single feed, preferring feeds that have never been fetched or were fetched least recently.
 *
 * @returns An array containing the selected feed row, or an empty array if no feeds exist
 */
export async function getAnyFeed() {
  const result = await db
    .select()
    .from(feeds)
    .orderBy(sql`${feeds.lastFetchedAt} asc nulls first`)
    .limit(1);
  return result;
}