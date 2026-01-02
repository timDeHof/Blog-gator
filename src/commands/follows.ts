import { User } from "src/lib/db/schema";
import { getFeedByUrl, createFeed } from "src/lib/db/queries/feeds";
import {
  createFeedFollow,
  getFeedFollowsForUser,
} from "src/lib/db/queries/follows";

export async function handlerFollowFeed(cmdName: string, user: User, ...args: string[]) {
  if (args.length !== 1) {
    throw new Error(`usage: ${cmdName} <feed url>`);
  }

  const feedUrl = args[0];
  let feed = await getFeedByUrl(feedUrl);

  // If feed doesn't exist, create it automatically
  if (!feed) {
    // Extract a name from the URL for the feed
    try {
      const url = new URL(feedUrl);
      const feedName = url.hostname.replace("www.", "");
      feed = await createFeed(feedName, feedUrl, user.id);

      if (!feed) {
        throw new Error(`Failed to create feed for URL ${feedUrl}`);
      }
    } catch (error) {
      throw new Error(`Invalid URL: ${feedUrl}`);
    }
  }

  const feedFollow = await createFeedFollow(feed.id, user.id);

  if (!feedFollow) {
    throw new Error(`Feed follow not created`);
  }

  console.log(`Feed follow created successfully:`);
  console.log(`  Feed: ${feedFollow.feed_name}`);
  console.log(`  User: ${feedFollow.user_name}`);
}
export async function handlerFollowing(cmdName: string, user: User) {
  const feedsFollowed = await getFeedFollowsForUser(user.id);

  if (feedsFollowed.length === 0) {
    throw new Error(`No feeds followed`);
  }

  console.log(`Feeds followed by ${user.name}:`);
  console.log("------------------------------");
  feedsFollowed.forEach((feedFollow: any) => {
    console.log(
      `  Feed: ${feedFollow.feeds.name}\n  URL: ${feedFollow.feeds.url}\n`
    );
  });
}
