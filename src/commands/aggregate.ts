import { getNextFeedToFetch, markFeedFetched } from "src/lib/db/queries/feeds";
import { fetchFeed } from "src/lib/utils/rss";
import { Feed, NewPost } from "src/lib/db/schema";
import { parseDuration } from "src/lib/utils/time";
import { createPost } from "src/lib/db/queries/posts";
import { logger } from "src/lib/utils/logger";

let currentScrape: Promise<void> | null = null;

export async function handlerAgg(cmdName: string, ...args: string[]) {
  if (args.length !== 1) {
    throw new Error(`usage: ${cmdName} <time_between_reqs>`);
  }
  const timeArg = args[0];
  const timeBetweenRequests = parseDuration(timeArg);
  if (!timeBetweenRequests) {
    throw new Error(
      `invalid duration: ${timeArg} - use format 1h 30m 15s or 3500ms`
    );
  }

  logger.info(`Collecting feeds every ${timeArg}...`);

  currentScrape = scrapeFeeds().catch(handleError);

  const interval = setInterval(() => {
    if (!currentScrape) {
      currentScrape = scrapeFeeds().catch(handleError);
    }
  }, timeBetweenRequests);

  await new Promise<void>((resolve) => {
    process.on("SIGINT", async () => {
      logger.info("Shutting down feed aggregator...");
      clearInterval(interval);
      if (currentScrape) {
        await currentScrape;
      }
      resolve();
    });
  });
}

async function scrapeFeeds() {
  try {
    const [feed] = await getNextFeedToFetch();
    if (!feed) {
      logger.info("No feeds to fetch");
      return;
    }
    logger.info(`Scraping feed: ${feed.name} (${feed.url})`);
    await scrapeFeed(feed);
  } finally {
    currentScrape = null;
  }
}

async function scrapeFeed(feed: Feed) {
  const feedData = await fetchFeed(feed.url);
  await markFeedFetched(feed.id);
  let newPostsCount = 0;
  let duplicatePostsCount = 0;
  for (let item of feedData.channel.item) {
    const now = new Date();

    try {
      await createPost({
        url: item.link,
        feedId: feed.id,
        title: item.title,
        createdAt: now,
        updatedAt: now,
        description: item.description,
        publishedAt: new Date(item.pubDate),
      } satisfies NewPost);
      console.log(`Found post: %s`, item.title);
      newPostsCount++;
    } catch (error) {
      // Post already exists, skip it
      duplicatePostsCount++;
      continue;
    }
  }
  logger.info(
    `Feed ${feed.name} collected, ${newPostsCount} new posts found, ${duplicatePostsCount} duplicates skipped`
  );
}

function handleError(err: unknown) {
  logger.error(
    `Error scraping feeds: ${err instanceof Error ? err.message : err}`
  );
}
