import { getNextFeedToFetch, markFeedFetched } from "src/lib/db/queries/feeds";
import { fetchFeed } from "src/lib/utils/rss";
import { Feed, NewPost } from "src/lib/db/schema";
import { parseDuration } from "src/lib/utils/time";
import { createPost } from "src/lib/db/queries/posts";
import { logger } from "src/lib/utils/logger";

let currentScrape: Promise<void> | null = null;

/**
 * Starts a recurring feed-scraping loop that fetches feeds at the specified interval and performs a graceful shutdown on SIGINT.
 *
 * @param cmdName - The invoked command name used in the usage error message
 * @param args - Expect a single-element array whose first element is the polling interval string (e.g., "1h 30m", "3500ms")
 * @throws Error - If the number of arguments is not exactly one or if the provided duration string cannot be parsed
 */
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

/**
 * Attempts to fetch the next feed scheduled for retrieval and, if one is found, processes it.
 *
 * If no feed is available, the function returns without processing. The module-level
 * `currentScrape` state is cleared when the operation completes or fails.
 */
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

/**
 * Fetches and processes a feed: retrieves its RSS, marks the feed as fetched, creates posts for each item, and logs a summary.
 *
 * @param feed - The feed record to scrape (provides id, name, and url)
 */
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

/**
 * Logs an error that occurred while scraping feeds.
 *
 * @param err - The error object or value; if it's an `Error`, its `message` is logged, otherwise the value itself is logged
 */
function handleError(err: unknown) {
  logger.error(
    `Error scraping feeds: ${err instanceof Error ? err.message : err}`
  );
}