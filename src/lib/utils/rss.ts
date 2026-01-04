import { XMLParser } from "fast-xml-parser";

type RSSFeed = {
  channel: {
    title: string;
    link: string;
    description: string;
    item: RSSItem[];
  };
};

type RSSItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
};

/*
 Fetch a feed from a given URL, return a filled-out RSSFeed object
*/
export async function fetchFeed(feedURL: string) {
  const response = await fetch(feedURL, {
    headers: {
      "User-Agent": "gator",
      accept: "application/xml",
    },
  });
  if (!response.ok) {
    throw new Error(
      `failed to fetch feed: ${response.status} ${response.statusText}`
    );
  }
  const xml = await response.text();
  const parser = new XMLParser();
  const result = parser.parse(xml);

  const channel = result.rss?.channel;
  if (!channel) throw new Error("No channel found in feed");

  const { title, link, description, item } = channel;
  if (!channel || !title || !link || !description || !item)
    throw new Error("Missing required fields in feed");

  const items: any[] = Array.isArray(item) ? item : [item];

  const rssItems: RSSItem[] = [];

  for (const item of items) {
    const { title, link, description, pubDate } = item;
    if (!title || !link || !description || !pubDate)
      throw new Error("Missing required fields in feed item");
    rssItems.push({
      title,
      link,
      description,
      pubDate,
    });
  }
  const rssFeed: RSSFeed = {
    channel: {
      title,
      link,
      description,
      item: rssItems,
    },
  };

  return rssFeed;
}
