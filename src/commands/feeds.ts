import { readConfig } from "src/config";
import { createFeed, listFeeds } from "src/lib/db/queries/feeds";
import { getUserByName } from "src/lib/db/queries/users";
import { Feed, User } from "src/lib/db/schema";

export async function handlerAddFeed(cmdName: string, ...args: string[]) {
  if (args.length !== 2) {
    throw new Error(`usage: ${cmdName} <feed name> <feed url>`);
  }

  const config = readConfig();
  const user = await getUserByName(config.currentUserName);

  if (!user) {
    throw new Error(`User ${config.currentUserName} not found`);
  }

  const feedName = args[0];
  const url = args[1];

  const feed = await createFeed(feedName, url, user.id);

  if (!feed) {
    throw new Error(`Feed ${feedName} not created`);
  }

  console.log("Feed created successfully:");
  printFeed(feed, user);
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
    const feed = item.feeds;
    const user = item.users;
    console.log("--------");
    console.log(`* ID:        ${feed.id}`);
    console.log(`* Created:   ${feed.createdAt}`);
    console.log(`* Updated:   ${feed.updatedAt}`);
    console.log(`* Name:      ${feed.name}`);
    console.log(`* URL:       ${feed.url}`);
    console.log(`* User:      ${user?.name || "Unknown"}`);
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
