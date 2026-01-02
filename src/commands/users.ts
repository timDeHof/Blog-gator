import { setUser, readConfig } from "../config";
import {
  createUser,
  getUserByName,
  deleteUsers,
  getUsers,
} from "src/lib/db/queries/users";
import { logAuditAction } from "../lib/logger";

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
    const maskedUsername = `${userName.substring(0, 2)}***${userName.substring(
      userName.length - 2
    )}`;
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
    const maskedUsername = `${userName.substring(0, 2)}***${userName.substring(
      userName.length - 2
    )}`;
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
  // Check for confirmation flag
  const hasForceFlag = args.includes("--force") || args.includes("-f");

  if (!hasForceFlag) {
    console.error(
      "ERROR: This is a destructive operation that deletes ALL users."
    );
    console.error("To confirm, use the --force or -f flag:");
    console.error(`  ${cmdName} --force`);
    throw new Error("Confirmation required: use --force flag to proceed");
  }

  // Validate that the user is an admin (redundant check, but good to be explicit)
  if (!user.isAdmin) {
    // Log diagnostic information without exposing PII
    const maskedUsername = `${user.name.substring(
      0,
      2
    )}***${user.name.substring(user.name.length - 2)}`;
    logAuditAction(
      "UNAUTHORIZED_ADMIN_ACCESS",
      maskedUsername,
      `Unauthorized admin access attempt by masked username: ${maskedUsername}`
    );
    throw new Error("User not authorized for this operation");
  }

  // Log the audit action before performing the destructive operation
  logAuditAction(
    "USER_RESET_INITIATED",
    user.name,
    `Initiated by ${user.name}`
  );

  try {
    await deleteUsers();
    console.log("Users deleted successfully");

    // Log successful completion
    logAuditAction(
      "USER_RESET_COMPLETED",
      user.name,
      `Completed by ${user.name}`
    );
  } catch (error) {
    // Log failure
    logAuditAction(
      "USER_RESET_FAILED",
      user.name,
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
