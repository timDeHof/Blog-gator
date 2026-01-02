import { db } from "..";
import { eq } from "drizzle-orm";
import { feed_follows, feeds, users } from "../schema";
import { logger } from "../../logger";
import { InputSanitizer } from "../../sanitizer";

/**
 * Type guard to check if an error is a database error with a code property
 */
function isDatabaseError(error: Error): error is DatabaseError {
  return (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
  );
}

/**
 * Type guard to check if an error is a custom application error
 * Since we don't have custom error classes, this is a placeholder for future use
 */
function isCustomError(error: Error): error is CustomError {
  // TODO: Implement proper custom error type guard
  // This should check for custom error properties or use instanceof when CustomError class is defined
  // For now, this is intentionally dormant as no custom errors are implemented yet
  return false;
}

/**
 * Extract constraint name from database error message
 */
function extractConstraintName(error: DatabaseError): string | null {
  // Try to extract constraint name from error message
  const constraintMatch = error.message.match(/constraint\s+[`"]([^`"]+)[`"]/i);
  if (constraintMatch && constraintMatch[1]) {
    return constraintMatch[1];
  }

  // Try to extract from constraint name property if available
  if (error.constraint) {
    return error.constraint;
  }

  return null;
}

/**
 * Type definition for database errors with code and constraint properties
 */
interface DatabaseError extends Error {
  code: string;
  constraint?: string;
  detail?: string;
}

/**
 * Type definition for custom application errors
 * This interface should be extended when custom error classes are implemented
 */
interface CustomError extends Error {
  isCustom?: boolean;
  errorType?: string;
  // Add other custom error properties as needed
}

// Helper function to sanitize errors for logging
function sanitizeErrorForLogging(error: unknown): string {
  const sanitizer = InputSanitizer.createDefault();

  try {
    // Convert error to string representation
    let errorString: string;

    if (error instanceof Error) {
      // For Error objects, create a sanitized version
      errorString = `Error: ${error.message}`;

      // Remove sensitive information like SQL, constraint names, and stack traces
      errorString = errorString
        .replace(/\bconstraint\b\s+[`"]([^`"]+)[`"]/gi, "constraint [REDACTED]")
        .replace(
          /\b(WHERE|FROM|INSERT|UPDATE|DELETE|SELECT)\b/gi,
          "[SQL_REDACTED]"
        )
        .replace(/\b(feeds|users|feed_follows)\b/gi, "[TABLE_REDACTED]")
        .replace(/\b(feed_id|user_id)\b/gi, "[COLUMN_REDACTED]");
    } else {
      // For non-Error objects, convert to string and sanitize
      errorString = String(error);
      errorString = sanitizer.sanitizeString(errorString, "error", {
        allowEmpty: true,
      });
    }

    return errorString;
  } catch (sanitizeError) {
    // If sanitization fails, return a safe fallback
    return "[ERROR_SANITIZATION_FAILED]";
  }
}

// Export helper functions for testing
export { isDatabaseError, extractConstraintName, isCustomError };

export async function createFeedFollow(feedId: string, actorId: string) {
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

      // Use inner joins since foreign key constraints prevent orphaned records
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
        .innerJoin(feeds, eq(feed_follows.feed_id, feeds.id))
        .innerJoin(users, eq(feed_follows.user_id, users.id))
        .where(eq(feed_follows.id, newFeedFollow.id))
        .limit(1);

      const followData = result[0];

      // Check if result exists (basic safety check)
      if (!followData) {
        throw new Error("Failed to retrieve created feed follow");
      }

      return followData;
    } catch (error) {
      // TODO: Check if this is a custom error and re-throw it unchanged
      // This is intentionally dormant until custom error classes are implemented
      if (error instanceof Error && isCustomError(error)) {
        throw error;
      }

      // Normalize non-Error throwables to Error
      if (!(error instanceof Error)) {
        const errorId =
          Date.now().toString(36) + Math.random().toString(36).substring(2);
        const sanitizedError = sanitizeErrorForLogging(error);

        // Environment-aware logging
        if (process.env.NODE_ENV !== "production") {
          logger.error(
            `Unexpected error in createFeedFollow (ID: ${errorId}): ${sanitizedError}`,
            {
              errorId: errorId,
              context: "createFeedFollow",
              fullError: error,
            }
          );
        } else {
          logger.error(
            `Unexpected error in createFeedFollow (ID: ${errorId}): [ERROR_REDACTED]`,
            {
              errorId: errorId,
              context: "createFeedFollow",
            }
          );
        }

        throw new Error(
          "An unexpected error occurred while creating the feed follow"
        );
      }

      // Use typed guards to check for database error codes
      if (isDatabaseError(error)) {
        const dbError = error as DatabaseError;

        // Handle unique constraint violation (PostgreSQL error code 23505)
        if (dbError.code === "23505") {
          throw new Error("You are already following this feed");
        }

        // Handle foreign key violations (PostgreSQL error code 23503)
        if (dbError.code === "23503") {
          const constraintName = extractConstraintName(dbError);
          if (constraintName) {
            if (
              constraintName.includes("feed_id") ||
              constraintName.includes("feeds")
            ) {
              throw new Error("Feed not found");
            } else if (
              constraintName.includes("user_id") ||
              constraintName.includes("users")
            ) {
              throw new Error("User not found");
            }
          }
          throw new Error("Referenced resource not found");
        }
      }

      // For any other errors, provide a generic message
      const errorId =
        Date.now().toString(36) + Math.random().toString(36).substring(2);
      const sanitizedError = sanitizeErrorForLogging(error);

      // Environment-aware logging
      if (process.env.NODE_ENV !== "production") {
        logger.error(
          `Database error in createFeedFollow (ID: ${errorId}): ${sanitizedError}`,
          {
            errorId: errorId,
            context: "createFeedFollow",
            fullError: error,
          }
        );
      } else {
        logger.error(
          `Database error in createFeedFollow (ID: ${errorId}): [ERROR_REDACTED]`,
          {
            errorId: errorId,
            context: "createFeedFollow",
          }
        );
      }

      throw new Error("Failed to create feed follow due to a database error");
    }
  });
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
