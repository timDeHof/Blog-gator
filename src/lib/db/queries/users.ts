import { eq } from "drizzle-orm";
import { db } from "..";
import { users } from "../schema";

/**
 * Normalize isAdmin value to ensure it's always a boolean
 * Handles legacy string values from when the column was text type
 * @param user - User object that might have string isAdmin value
 * @returns User object with boolean isAdmin value
 */
function normalizeUserIsAdmin(user: any): any {
  if (user && typeof user.isAdmin !== "undefined") {
    // Handle legacy string values
    if (typeof user.isAdmin === "string") {
      user.isAdmin = user.isAdmin.toLowerCase() === "true";
    }
    // Ensure it's a boolean
    user.isAdmin = Boolean(user.isAdmin);
  }
  return user;
}

export async function createUser(name: string) {
  const [result] = await db.insert(users).values({ name: name }).returning();
  return result;
}

export async function getUserByName(name: string) {
  const [result] = await db.select().from(users).where(eq(users.name, name));
  return normalizeUserIsAdmin(result);
}

export async function deleteUsers() {
  await db.delete(users);
}

export async function getUsers() {
  const result = await db.select().from(users);
  return result.map(normalizeUserIsAdmin);
}
