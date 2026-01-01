import { setUser } from "../config";
import { createUser, getUserByName, truncateUsers } from "src/lib/db/queries/users";
export async function handlerLogin(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  if (args.length !== 1) {
    throw new Error(`usage ${cmdName} <name>`);
  }

  const userName = args[0];
  const existingUser = await getUserByName(userName);
  if (!existingUser) {
    throw new Error(`User ${userName} does not exist`);
  }
  setUser(existingUser.name);
  console.log(`User switched successfully`);
}
/* Create a new user in the database */
export async function handlerRegister(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  if (args.length !== 1) {
    throw new Error(`usage ${cmdName} <name>`);
  }

  const userName = args[0];
  const user = await createUser(userName);
  if (!user) {
    throw new Error(`User ${userName} already exists`);
  }
  setUser(user.name);
  console.log(`User ${user.name} created successfully`);
}

/* Truncate the users table */
export async function handlerTruncateUsers(
  cmdName: string,
  ...args: string[]
): Promise<void> {
  await truncateUsers();
  console.log("Users table truncated successfully");
}
