import { User } from "src/lib/db/schema";
import { getPostsForUser } from "src/lib/db/queries/posts";

/**
 * Retrieve and print a limited number of posts for the given user.
 *
 * @param cmdName - Command name used in the usage error message.
 * @param user - The user whose posts will be fetched and displayed.
 * @param args - Optional arguments; if provided, the first element is parsed as the maximum number of posts to fetch.
 * @throws Error - If the parsed limit is not a positive number (message: `usage: ${cmdName} [limit] - limit must be a positive number`).
 */
export async function handlerBrowse(
  cmdName: string,
  user: User,
  ...args: string[]
) {
  const limit = args.length > 0 ? parseInt(args[0]) : 2;

  if (isNaN(limit) || limit <= 0) {
    throw new Error(
      `usage: ${cmdName} [limit] - limit must be a positive number`
    );
  }

  const posts = await getPostsForUser(user.id, limit);

  if (posts.length === 0) {
    console.log("No posts found. Follow some feeds first!");
    return;
  }

  console.log(`Found ${posts.length} posts for user ${user.name}:`);
  console.log("=====================================");
  for (const post of posts) {
    const publishedTime = post.publishedAt
      ? post.publishedAt.toLocaleString()
      : "Unknown date";
    console.log(`${publishedTime} from ${post.feedName}`);
    console.log(`--- ${post.title} ---`);
    if (post.description) {
      console.log(`     ${post.description}`);
    }
    console.log(`Link: ${post.url}`);
    console.log("=====================================");
  }
}
