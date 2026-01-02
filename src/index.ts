import { middlewareLoggedIn } from "./middleware";
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
import { middlewareAdminOnly } from "./middleware";
import { handlerAgg } from "./commands/aggregate";
import { handlerAddFeed, handlerListFeeds } from "./commands/feeds";
import { handlerFollowFeed, handlerFollowing } from "./commands/follows";

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log("usage: cli <command> [args...]");
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
    middlewareAdminOnly(handlerDeleteUsers)
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
  try {
    await runCommand(commandsRegistry, cmdName, ...cmdArgs);
  } catch (err) {
    if (err instanceof Error) {
      console.error(`Error running command ${cmdName}: ${err.message}`);
    } else {
      console.error(`Error running command ${cmdName}: ${err}`);
    }
    process.exit(1);
  }
  process.exit(0);
}

main();
