import { createFeed, listFeeds } from "src/lib/db/queries/feeds";
import { getUserByName } from "src/lib/db/queries/users";
import { createFeedFollow } from "src/lib/db/queries/follows";
import { Feed, User } from "src/lib/db/schema";
import { readConfig } from "src/config";

import { createFeed, listFeeds } from "src/lib/db/queries/feeds";
import { createFeedFollow } from "src/lib/db/queries/follows";
import { Feed, User } from "src/lib/db/schema";

export async function handlerAddFeed(cmdName: string, user: User, ...args: string[]) {
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

  console.log("Feed created and followed successfully:");
  console.log(`  Feed: ${feedFollow.feed_name}`);
  console.log(`  User: ${feedFollow.user_name}`);
}

export async function handlerListFeeds(cmdName: string) {
  const config = readConfig();
  const user = await getUserByName(config.currentUserName);

  if (!user) {
    throw new Error(`User ${config.currentUserName} not found`);
  }

  const feeds = await listFeeds();

  if (!feeds) {
    throw new Error(`No feeds found`);
  }

  console.log("Feeds:");
  feeds.forEach((item) => {
    const feed = item.feeds as Feed;
    const user = item.users as User;

    printFeed(feed, user);
  });
}

function printFeed(feed: Feed, user: User) {
  console.log(`* ID:        ${feed.id}`);
  console.log(`* Created:   ${feed.createdAt}`);
  console.log(`* Updated:   ${feed.updatedAt}`);
  console.log(`* Name:      ${feed.name}`);
  console.log(`* URL:       ${feed.url}`);
  console.log(`* User:      ${user.name}`);
}
