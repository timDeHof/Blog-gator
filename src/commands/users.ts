import { setUser, readConfig } from "../config";
import {
  createUser,
  getUserByName,
  deleteUsers,
  getUsers,
} from "src/lib/db/queries/users";
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

/* Resets the users table */
export async function handlerDeleteUsers(): Promise<void> {
  await deleteUsers();
  console.log("Users deleted successfully");
}

export async function handlerGetUsers(): Promise<void> {
  const config = readConfig();
  const currentUserName = config.currentUserName;
  const users = await getUsers();
  users.map((user) => console.log(`* ${user.name} ${user.name === currentUserName ? '(current)' : ''}`));
}
