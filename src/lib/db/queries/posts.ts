import { db } from "..";
import { NewPost, posts, feeds, feed_follows } from "../schema";
import { eq, desc } from "drizzle-orm";

/**
 * Insert a new post into the database and return the inserted row.
 *
 * @param post - The post data conforming to the `NewPost` schema to insert.
 * @returns The newly inserted post record, including any generated fields.
 * @throws The underlying database error if the insert fails (for example, a constraint violation).
 */
export async function createPost(post: NewPost) {
  const [result] = await db.insert(posts).values(post).returning();
  return result;
}

/**
 * Retrieve recent posts from feeds followed by a user.
 *
 * @param userId - The ID of the user whose followed feeds should be queried
 * @param limit - Maximum number of posts to return (default: 10)
 * @returns An array of post records containing `id`, `createdAt`, `updatedAt`, `title`, `url`, `description`, `publishedAt`, `feedName`, and `feedId`
 */
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
