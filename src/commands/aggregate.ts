import { getNextFeedToFetch, markFeedFetched } from "src/lib/db/queries/feeds";
import { fetchFeed } from "src/lib/utils/rss";
import { parseDuration } from "src/lib/utils/time";
import { Feed } from "src/lib/db/schema";
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
    currentScrape = scrapeFeeds().catch(handleError);
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
  const [feed] = await getNextFeedToFetch();
  if (!feed) {
    logger.info("No feeds to fetch");
    return;
  }
  logger.info(`Found a feed to fetch!`);
  await scrapeFeed(feed);
}

async function scrapeFeed(feed: Feed) {
  await markFeedFetched(feed.id);

  const feedData = await fetchFeed(feed.url);

  logger.info(
    `Feed ${feed.name} collected, ${feedData.channel.item.length} posts found`
  );
}

function handleError(err: unknown) {
  logger.error(
    `Error scraping feeds: ${err instanceof Error ? err.message : err}`
  );
}
