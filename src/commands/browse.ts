import { User } from "src/lib/db/schema";
import { getPostsForUser } from "src/lib/db/queries/posts";

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
  for (let post of posts) {
    console.log(`${post.publishedAt} from ${post.feedName}`);
    console.log(`--- ${post.title} ---`);
    console.log(`    ${post.description}`);
    console.log(`Link: ${post.url}`);
    console.log("=====================================");
  }
}
