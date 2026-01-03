import { createFeed, listFeeds } from "src/lib/db/queries/feeds";
import { getUserByName } from "src/lib/db/queries/users";
import { createFeedFollow } from "src/lib/db/queries/follows";
import { Feed, User } from "src/lib/db/schema";
import { readConfig } from "src/config";
import { logAuditAction, logger } from "src/lib/utils/logger";

export async function handlerAddFeed(
  cmdName: string,
  user: User,
  ...args: string[]
) {
  if (args.length !== 2) {
    throw new Error(`usage: ${cmdName} <feed name> <feed url>`);
  }

  const feedName = args[0];
  const url = args[1];

  const feed = await createFeed(feedName, url, user.id);

  if (!feed) {
    throw new Error(`Feed ${feedName} not created`);
  }

  // Automatically create a feed follow record for the current user
  const feedFollow = await createFeedFollow(feed.id, user.id);

  if (!feedFollow) {
    throw new Error(`Feed follow not created`);
  }

  logger.info("Feed created and followed successfully:");
  logger.info(`  Feed: ${feedFollow.feed_name}`);
  logger.info(`  User: ${feedFollow.user_name}`);
}

export async function handlerListFeeds(cmdName: string) {
  const config = readConfig();
  const user = await getUserByName(config.currentUserName);

  if (!user) {
    // Log diagnostic information without exposing PII
    // Validate config.currentUserName and create appropriate mask
    let maskedUsername = "***"; // Safe default fallback
    if (
      typeof config.currentUserName === "string" &&
      config.currentUserName.length > 0
    ) {
      if (config.currentUserName.length < 4) {
        // For short names, return mask of same length to avoid revealing characters
        maskedUsername = "*".repeat(config.currentUserName.length);
      } else {
        // For longer names, use first 2 chars + '***'+ last 2 chars
        maskedUsername = `${config.currentUserName.slice(
          0,
          2
        )}***${config.currentUserName.slice(-2)}`;
      }
    }
    logAuditAction("USER_NOT_FOUND", maskedUsername, `User lookup failed`);
    throw new Error("User not found");
  }

  const feeds = await listFeeds();

  if (!feeds) {
    throw new Error(`No feeds found`);
  }

  logger.info("Feeds:");
  feeds.forEach((item) => {
    const feed = item.feeds as Feed;
    const user = item.users as User;

    printFeed(feed, user);
  });
}

function printFeed(feed: Feed, user: User) {
  logger.info(`* ID:        ${feed.id}`);
  logger.info(`* Created:   ${feed.createdAt}`);
  logger.info(`* Updated:   ${feed.updatedAt}`);
  logger.info(`* Name:      ${feed.name}`);
  logger.info(`* URL:       ${feed.url}`);
  logger.info(`* User:      ${user.name}`);
}
