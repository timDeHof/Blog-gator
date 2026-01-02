import { eq } from "drizzle-orm";
import { db } from "..";
import { users } from "../schema";
import type { User } from "../schema";

/**
 * Parse legacy boolean values from various formats
 * Handles booleans, numbers (1/0), and legacy strings ("true"/"false", "1"/"0", "yes"/"no")
 * @param value - The value to parse
 * @returns Boolean value or undefined if parsing fails
 */
export function parseLegacyBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
    return undefined;
  }

  if (typeof value === "string") {
    const lowerValue = value.toLowerCase().trim();
    if (
      lowerValue === "true" ||
      lowerValue === "1" ||
      lowerValue === "yes" ||
      lowerValue === "y" ||
      lowerValue === "on"
    ) {
      return true;
    }
    if (
      lowerValue === "false" ||
      lowerValue === "0" ||
      lowerValue === "no" ||
      lowerValue === "n" ||
      lowerValue === "off"
    ) {
      return false;
    }
  }

  return undefined;
}

/**
 * Normalize isAdmin value to ensure it's always a boolean
 * Handles legacy string values from when the column was text type
 * After migration, this primarily validates that isAdmin is a proper boolean
 * @param user - User object that might have string isAdmin value
 * @returns User object with boolean isAdmin value
 */
export function normalizeUserIsAdmin(
  user: Partial<User> | Record<string, any>
): User {
  if (!user) {
    return user as User;
  }

  // After migration, isAdmin should already be a boolean, but we keep the legacy parsing
  // for safety during the transition period
  const parsedIsAdmin =
    user.isAdmin !== undefined ? parseLegacyBoolean(user.isAdmin) : false;

  // Return a new object copy with normalized isAdmin, preserving other properties
  return {
    ...user,
    isAdmin: parsedIsAdmin ?? false,
  } as User;
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
