import { middlewareLoggedIn, middlewareAdminOnly } from "./middleware";
import {
  type CommandsRegistry,
  registerCommand,
  runCommand,
} from "./commands/commands";
import {
  handlerLogin,
  handlerRegister,
  handlerDeleteUsers,
  handlerGetUsers,
} from "./commands/users";
import { handlerAgg } from "./commands/aggregate";
import { handlerAddFeed, handlerListFeeds } from "./commands/feeds";
import {
  handlerFollowFeed,
  handlerFollowing,
  handlerUnfollowFeed,
} from "./commands/follows";
import { logger } from "src/lib/utils/logger";

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    logger.warn("usage: cli <command> [args...]");
    process.exit(1);
  }

  const cmdName = args[0];
  const cmdArgs = args.slice(1);
  const commandsRegistry: CommandsRegistry = {};

  await registerCommand(commandsRegistry, "login", handlerLogin);
  await registerCommand(commandsRegistry, "register", handlerRegister);
  await registerCommand(
    commandsRegistry,
    "reset",
    middlewareLoggedIn(handlerDeleteUsers)
  );
  await registerCommand(commandsRegistry, "users", handlerGetUsers);
  await registerCommand(commandsRegistry, "agg", handlerAgg);
  await registerCommand(
    commandsRegistry,
    "addfeed",
    middlewareLoggedIn(handlerAddFeed)
  );
  await registerCommand(commandsRegistry, "feeds", handlerListFeeds);
  await registerCommand(
    commandsRegistry,
    "follow",
    middlewareLoggedIn(handlerFollowFeed)
  );
  await registerCommand(
    commandsRegistry,
    "following",
    middlewareLoggedIn(handlerFollowing)
  );
  await registerCommand(
    commandsRegistry,
    "unfollow",
    middlewareLoggedIn(handlerUnfollowFeed)
  );

  try {
    await runCommand(commandsRegistry, cmdName, ...cmdArgs);
  } catch (err) {
    if (err instanceof Error) {
      logger.error(`Error running command ${cmdName}: ${err.message}`);
    } else {
      logger.error(`Error running command ${cmdName}: ${err}`);
    }
    process.exit(1);
  }
  process.exit(0);
}

main();
