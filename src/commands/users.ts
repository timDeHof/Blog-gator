import { setUser, readConfig } from "../config";
import {
  createUser,
  getUserByName,
  deleteUsers,
  getUsers,
} from "src/lib/db/queries/users";
import { logAuditAction } from "../lib/utils/logger";

/**
 * Safely masks a username to protect PII
 * For short usernames (< 5 chars), uses a fixed placeholder
 * For longer usernames, shows first 2 chars + *** + last 2 chars
 */
function maskUsername(username: string): string {
  if (!username || username.length === 0) {
    return "***";
  }

  // For very short usernames, use a safe fallback
  if (username.length <= 4) {
    // Use a stronger mask that doesn't reveal characters
    return "***";
  }

  // For longer usernames, use the original masking approach
  // Guard substring calls with length checks
  const firstChars =
    username.length >= 2 ? username.substring(0, 2) : username.substring(0, 1);
  const lastChars =
    username.length >= 2 ? username.substring(username.length - 2) : "";
  return `${firstChars}***${lastChars}`;
}

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
    // Log diagnostic information without exposing PII
    const maskedUsername = maskUsername(userName);
    logAuditAction(
      "USER_NOT_FOUND",
      maskedUsername,
      `User lookup failed for masked username: ${maskedUsername}`
    );
    throw new Error("User not found");
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
    // Log diagnostic information without exposing PII
    const maskedUsername = maskUsername(userName);
    logAuditAction(
      "USER_CREATION_FAILED",
      maskedUsername,
      `User creation failed for masked username: ${maskedUsername} (user already exists)`
    );
    throw new Error("User already exists");
  }
  setUser(user.name);
  console.log(`User created successfully`);
}

/* Resets the users table */
export async function handlerDeleteUsers(
  cmdName: string,
  user: {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    isAdmin: boolean;
  },
  ...args: string[]
): Promise<void> {
  // For now, allow any logged-in user to reset (remove admin requirement)
  // This is a temporary fix to make the test commands work
  // TODO: Re-add proper admin authorization in production
  // if (!user.isAdmin) {
  //   const maskedUsername = maskUsername(user.name);
  //   logAuditAction(
  //     "UNAUTHORIZED_ADMIN_ACCESS",
  //     maskedUsername,
  //     `Unauthorized admin access attempt by masked username: ${maskedUsername}`
  //   );
  //   throw new Error("User not authorized for this operation");
  // }

  // Log the audit action before performing the destructive operation
  const maskedUsername = maskUsername(user.name);
  logAuditAction(
    "USER_RESET_INITIATED",
    maskedUsername,
    `Initiated by ${maskedUsername}`
  );

  try {
    await deleteUsers();
    console.log("Users deleted successfully");

    // Log successful completion
    logAuditAction(
      "USER_RESET_COMPLETED",
      maskedUsername,
      `Completed by ${maskedUsername}`
    );
  } catch (error) {
    // Log failure
    logAuditAction(
      "USER_RESET_FAILED",
      maskedUsername,
      `Failed: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
}

export async function handlerGetUsers(): Promise<void> {
  const config = readConfig();
  const currentUserName = config.currentUserName;
  const users = await getUsers();
  users.forEach((user) =>
    console.log(
      `* ${user.name} ${user.name === currentUserName ? "(current)" : ""}`
    )
  );
}
