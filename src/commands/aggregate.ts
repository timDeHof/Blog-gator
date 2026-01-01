import { fetchFeed } from "src/lib/rss";

export async function handlerAgg(_: string): Promise<void> {
  const feedURL = "https://www.wagslane.dev/index.xml";
  const feed = await fetchFeed(feedURL);
  const feedStr = JSON.stringify(feed, null, 2);
  console.log(feedStr);
}
