import { db } from "..";
import { eq } from "drizzle-orm";
import { feed_follows, feeds, users } from "../schema";

export async function createFeedFollow(feedId: string, actorId: string) {
  try {
    // Use a transaction to ensure atomicity of insert + select
    return await db.transaction(async (tx) => {
      try {
        // Attempt to insert the feed follow
        const [newFeedFollow] = await tx
          .insert(feed_follows)
          .values({
            feed_id: feedId,
            user_id: actorId,
          })
          .returning();

        // Use left joins to handle potential race conditions where feed/user might be deleted
        const result = await tx
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
          .leftJoin(feeds, eq(feed_follows.feed_id, feeds.id))
          .leftJoin(users, eq(feed_follows.user_id, users.id))
          .where(eq(feed_follows.id, newFeedFollow.id))
          .limit(1);

        const followData = result[0];

        // Check if feed or user are missing (race condition)
        if (!followData) {
          throw new Error("Failed to retrieve created feed follow");
        }
        if (!followData.feed_id) {
          throw new Error("Feed not found - it may have been deleted");
        }
        if (!followData.user_id) {
          throw new Error("User not found - it may have been deleted");
        }

        return followData;
      } catch (error) {
        // Map database errors to user-friendly messages
        if (error instanceof Error) {
          const errorMessage = error.message.toLowerCase();

          // Handle unique constraint violation (duplicate follow)
          if (
            errorMessage.includes("unique constraint") ||
            errorMessage.includes("already exists")
          ) {
            throw new Error("You are already following this feed");
          }

          // Handle foreign key violations
          if (
            errorMessage.includes("foreign key") ||
            errorMessage.includes("violates foreign key constraint")
          ) {
            if (
              errorMessage.includes("feed_id") ||
              errorMessage.includes("feeds")
            ) {
              throw new Error("Feed not found");
            } else if (
              errorMessage.includes("user_id") ||
              errorMessage.includes("users")
            ) {
              throw new Error("User not found");
            }
            throw new Error("Referenced resource not found");
          }

          // Handle null feed/user from race condition
          if (
            errorMessage.includes("feed not found") ||
            errorMessage.includes("user not found")
          ) {
            throw error; // Re-throw our custom errors
          }
        }

        // For any other errors, provide a generic message
        console.error("Database error in createFeedFollow:", error);
        throw new Error("Failed to create feed follow due to a database error");
      }
    });
  } catch (error) {
    // Handle transaction-level errors
    if (error instanceof Error) {
      throw error; // Re-throw the error from the transaction
    }
    console.error("Unexpected error in createFeedFollow:", error);
    throw new Error(
      "An unexpected error occurred while creating the feed follow"
    );
  }
}

export async function getFeedFollowsForUser(userId: string) {
  const result = await db
    .select({
      feed_follow_id: feed_follows.id,
      feed_follow_created_at: feed_follows.createdAt,
      feed_follow_updated_at: feed_follows.updatedAt,
      feed_id: feeds.id,
      feed_name: feeds.name,
      feed_url: feeds.url,
      user_id: feed_follows.user_id,
    })
    .from(feed_follows)
    .innerJoin(feeds, eq(feed_follows.feed_id, feeds.id))
    .where(eq(feed_follows.user_id, userId))
    .orderBy(feeds.name);
  return result;
}
