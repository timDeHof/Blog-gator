import { db } from "..";
import { eq, sql, lt } from "drizzle-orm";
import { feeds, users } from "../schema";

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

export async function getAnyFeed() {
  const result = await db
    .select()
    .from(feeds)
    .orderBy(sql`${feeds.lastFetchedAt} asc nulls first`)
    .limit(1);
  return result;
}
