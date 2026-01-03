import { User } from "src/lib/db/schema";
import { getFeedByUrl, createFeed } from "src/lib/db/queries/feeds";
import {
  createFeedFollow,
  getFeedFollowsForUser,
  deleteFeedFollow,
} from "src/lib/db/queries/follows";
import { logger } from "src/lib/utils/logger";

export async function handlerFollowFeed(
  cmdName: string,
  user: User,
  ...args: string[]
) {
  if (args.length !== 1) {
    throw new Error(`usage: ${cmdName} <feed url>`);
  }

  const feedUrl = args[0];
  let feed = await getFeedByUrl(feedUrl);

  // If feed doesn't exist, create it automatically
  if (!feed) {
    let url;
    try {
      url = new URL(feedUrl);
    } catch (error) {
      throw new Error(`Invalid URL: ${feedUrl}`);
    }

    try {
      const feedName = url.hostname.startsWith("www.")
        ? url.hostname.slice(4)
        : url.hostname;
      feed = await createFeed(feedName, feedUrl, user.id);

      if (!feed) {
        throw new Error(`Failed to create feed for URL ${feedUrl}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to create feed: ${String(error)}`);
    }
  }

  try {
    const feedFollow = await createFeedFollow(feed.id, user.id);

    if (!feedFollow) {
      throw new Error(`Feed follow not created`);
    }

    logger.info(`Feed follow created successfully:`);
    logger.info(`  Feed: ${feedFollow.feed_name}`);
    logger.info(`  User: ${feedFollow.user_name}`);
  } catch (error) {
    if (error instanceof Error) {
      // Check for unique constraint violation using PostgreSQL error code
      // PostgreSQL uses error code '23505' for unique constraint violations
      const postgresError = error as any;
      if (postgresError.code === "23505") {
        throw new Error(`You are already following this feed`);
      }

      // For other database errors, preserve the original error details
      throw new Error(`Failed to follow feed: ${error.message}`);
    }

    throw new Error(`Failed to follow feed due to an unexpected error`);
  }
}
export async function handlerFollowing(cmdName: string, user: User) {
  const feedsFollowed = await getFeedFollowsForUser(user.id);

  if (feedsFollowed.length === 0) {
    logger.info(`No feeds followed by ${user.name}`);
    return;
  }

  logger.info(`Feeds followed by ${user.name}:`);
  logger.info("------------------------------");
  feedsFollowed.forEach((feedFollow: any) => {
    logger.info(
      `  Feed: ${feedFollow.feed_name}\n  URL: ${feedFollow.feed_url}\n`
    );
  });
}

export async function handlerUnfollowFeed(
  cmdName: string,
  user: User,
  ...args: string[]
) {
  if (args.length !== 1) {
    throw new Error(`usage: ${cmdName} <feed url>`);
  }

  const feedUrl = args[0];

  try {
    await deleteFeedFollow(user.id, feedUrl);
    logger.info(`Feed unfollowed successfully: ${feedUrl}`);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to unfollow feed due to an unexpected error`);
  }
}
