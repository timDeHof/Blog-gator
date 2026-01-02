import { User } from "./lib/db/schema";
import { CommandHandler } from "./commands/commands";
import { readConfig } from "./config";
import { getUserByName } from "./lib/db/queries/users";
import { logAuditAction } from "./lib/logger";

/**
 * Get cache TTL from environment variable with fallback to default
 * @param envVarName Environment variable name
 * @param defaultValue Default value in seconds if env var is missing or invalid
 * @returns Cache TTL in seconds
 */
function getCacheTTLFromEnv(envVarName: string, defaultValue: number): number {
  const envValue = process.env[envVarName];

  if (!envValue) {
    return defaultValue;
  }

  const parsedValue = parseInt(envValue, 10);

  // Validate that parsed value is a positive number
  if (isNaN(parsedValue) || parsedValue < 0) {
    console.warn(
      `Invalid ${envVarName}: '${envValue}'. Using default: ${defaultValue}`
    );
    return defaultValue;
  }

  return parsedValue;
}

/**
 * Cache Configuration Strategy:
 *
 * This middleware implements a two-tier caching strategy for performance and security:
 *
 * 1. CACHE_TTL_SECONDS (default: 60 seconds):
 *    - Used for regular user data caching in middlewareLoggedIn
 *    - Provides performance benefits for non-admin operations
 *    - Configurable via environment variable
 *
 * 2. ADMIN_CACHE_TTL_SECONDS (default: 0 seconds = disabled):
 *    - NOTE: This parameter is now deprecated and ignored
 *    - Admin authorization checks ALWAYS bypass caching to prevent stale admin privileges
 *    - Ensures admin privilege revocations take effect immediately
 *    - Configurable via environment variable for flexibility (though now ignored)
 *
 * Security Considerations:
 * - Admin authorization checks ALWAYS bypass caching to prevent stale admin privileges
 * - Admin status is always verified against fresh database data
 * - Regular user data can still be cached for performance when admin status is confirmed
 * - All cache TTL values are validated and fall back to safe defaults
 *
 * Implementation Details:
 * - middlewareAdminOnly: Always fetches fresh user data for admin authorization
 * - After confirming admin status, may use cached data for non-admin properties
 * - This ensures security while maintaining performance for regular operations
 *
 * Environment Variables:
 * - CACHE_TTL_SECONDS: Set to desired TTL in seconds for regular user caching
 * - ADMIN_CACHE_TTL_SECONDS: Deprecated - admin checks always use fresh data
 */
// Cache configuration - configurable TTL in seconds
// CACHE_TTL_SECONDS: Default cache TTL for regular user data (default: 60 seconds)
// ADMIN_CACHE_TTL_SECONDS: Cache TTL for admin authorization checks (default: 0 seconds = disabled)
const CACHE_TTL_SECONDS = getCacheTTLFromEnv("CACHE_TTL_SECONDS", 60);
const ADMIN_CACHE_TTL_SECONDS = getCacheTTLFromEnv(
  "ADMIN_CACHE_TTL_SECONDS",
  0
);

/**
 * Validates the currentUserName from config and returns the trimmed username.
 * Throws a generic error if validation fails to avoid exposing PII.
 * @returns The trimmed username
 * @throws Error if currentUserName is missing or invalid
 */
function validateAndGetUserName(): string {
  const config = readConfig();

  if (
    !config ||
    !config.currentUserName ||
    typeof config.currentUserName !== "string" ||
    config.currentUserName.trim() === ""
  ) {
    throw new Error("Missing or invalid currentUserName in config");
  }

  return config.currentUserName.trim();
}

// In-memory cache structure
interface UserCacheEntry {
  user: User;
  timestamp: number; // Unix timestamp in milliseconds
  configUserName: string; // The username from config when cached
}

// Cache storage
const userCache: Record<string, UserCacheEntry> = {};

// Track pending requests to prevent duplicate concurrent calls
const pendingRequests: Record<string, Promise<User>> = {};

/**
 * Shared helper function to get cached user or fetch fresh user data
 * @param userName The username to fetch or get from cache
 * @returns Promise<User> - The user data
 * @throws Error if user not found
 */
async function getCachedOrFetchUser(userName: string): Promise<User> {
  const cacheKey = userName;
  const currentTime = Date.now();

  // Check if we have cached user data
  const cachedEntry = userCache[cacheKey];

  if (cachedEntry) {
    // Check if cache is still valid (not expired)
    const cacheAgeSeconds = (currentTime - cachedEntry.timestamp) / 1000;

    if (cacheAgeSeconds < CACHE_TTL_SECONDS) {
      // Cache is valid, but check if config username changed
      // (this shouldn't happen normally, but good to be defensive)
      if (cachedEntry.configUserName === userName) {
        // Return cached user
        return cachedEntry.user;
      }
    }
  }

  // Cache miss or expired - fetch fresh user data
  // Check if there's already a pending request for this user
  if (!pendingRequests[cacheKey]) {
    // No pending request, create one
    pendingRequests[cacheKey] = getUserByName(userName)
      .then((user) => {
        // Clean up pending request on success
        delete pendingRequests[cacheKey];
        return user;
      })
      .catch((err) => {
        // Clean up pending request on failure
        delete pendingRequests[cacheKey];
        throw err;
      });
  }

  // Wait for the pending request (either existing or just created)
  const user = await pendingRequests[cacheKey];

  if (!user) {
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

  // Update cache with fresh data
  userCache[cacheKey] = {
    user,
    timestamp: currentTime,
    configUserName: userName,
  };

  return user;
}

type UserCommandHandler = (
  cmdName: string,
  user: User,
  ...args: string[]
) => Promise<void>;

export const middlewareLoggedIn = (
  handler: UserCommandHandler
): CommandHandler => {
  return async (cmdName: string, ...args: string[]) => {
    // Validate config and currentUserName before calling getUserByName
    const currentUserName = validateAndGetUserName();

    // Use the shared helper to get cached or fetch user
    const user = await getCachedOrFetchUser(currentUserName);

    return handler(cmdName, user, ...args);
  };
};

export const middlewareAdminOnly = (
  handler: UserCommandHandler
): CommandHandler => {
  return async (cmdName: string, ...args: string[]) => {
    // Validate config and currentUserName before calling getUserByName
    const currentUserName = validateAndGetUserName();

    // For admin authorization, we ALWAYS fetch fresh user data to ensure
    // admin privilege revocations take effect immediately
    const cacheKey = currentUserName;
    const currentTime = Date.now();

    // Bypass cache for admin check - always fetch fresh
    let freshUser: User;
    if (!pendingRequests[cacheKey]) {
      // No pending request, create one
      pendingRequests[cacheKey] = getUserByName(currentUserName)
        .then((user) => {
          // Clean up pending request on success
          delete pendingRequests[cacheKey];
          return user;
        })
        .catch((err) => {
          // Clean up pending request on failure
          delete pendingRequests[cacheKey];
          throw err;
        });
    }

    // Wait for the pending request (either existing or just created)
    freshUser = await pendingRequests[cacheKey];

    if (!freshUser) {
      // Log diagnostic information without exposing PII
      const maskedUsername = `${currentUserName.substring(
        0,
        2
      )}***${currentUserName.substring(currentUserName.length - 2)}`;
      logAuditAction(
        "USER_NOT_FOUND",
        maskedUsername,
        `User lookup failed for masked username: ${maskedUsername}`
      );
      throw new Error("User not found");
    }

    // Check if user is admin using fresh data
    if (!freshUser.isAdmin) {
      // Log diagnostic information without exposing PII
      const maskedUsername = `${currentUserName.substring(
        0,
        2
      )}***${currentUserName.substring(currentUserName.length - 2)}`;
      logAuditAction(
        "UNAUTHORIZED_ADMIN_ACCESS",
        maskedUsername,
        `Unauthorized admin access attempt by masked username: ${maskedUsername}`
      );
      throw new Error("User not authorized for admin commands");
    }

    // For non-admin data, we can use cached data if available and not expired
    // This preserves performance for regular user data while ensuring admin checks are always fresh
    const cachedEntry = userCache[cacheKey];
    let userDataToPass = freshUser; // Default to fresh data

    if (cachedEntry) {
      // Check if cache is still valid (not expired)
      const cacheAgeSeconds = (currentTime - cachedEntry.timestamp) / 1000;

      if (
        cacheAgeSeconds < CACHE_TTL_SECONDS &&
        cachedEntry.configUserName === currentUserName
      ) {
        // Use cached data for non-admin properties to maintain performance
        // But we've already verified admin status with fresh data above
        userDataToPass = cachedEntry.user;
      }
    }

    // Update cache with fresh data (but only if we fetched fresh data)
    userCache[cacheKey] = {
      user: freshUser,
      timestamp: currentTime,
      configUserName: currentUserName,
    };

    return handler(cmdName, userDataToPass, ...args);
  };
};
