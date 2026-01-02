import { db } from "..";
import { eq } from "drizzle-orm";
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

export async function getFeedByUrl(url: string) {
  const [result] = await db.select().from(feeds).where(eq(feeds.url, url));
  return result;
}
