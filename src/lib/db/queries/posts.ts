import { db } from "..";
import { NewPost, posts, feeds, feed_follows } from "../schema";
import { eq, desc } from "drizzle-orm";

export async function createPost(post: NewPost) {
  try {
    const [result] = await db.insert(posts).values(post).returning();
    return result;
  } catch (error) {
    // Re-throw to let caller handle duplicates
    throw error;
  }
}

export async function getPostsForUser(userId: string, limit: number = 10) {
  const result = await db
    .select({
      id: posts.id,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      title: posts.title,
      url: posts.url,
      description: posts.description,
      publishedAt: posts.publishedAt,
      feedName: feeds.name,
      feedId: posts.feedId,
    })
    .from(posts)
    .innerJoin(feed_follows, eq(posts.feedId, feed_follows.feed_id))
    .innerJoin(feeds, eq(posts.feedId, feeds.id))
    .where(eq(feed_follows.user_id, userId))
    .orderBy(desc(posts.publishedAt))
    .limit(limit);

  return result;
}
