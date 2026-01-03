import { User } from "./lib/db/schema";
import { CommandHandler } from "./commands/commands";
import { readConfig } from "./config";
import { getUserByName, createUser } from "./lib/db/queries/users";
import { logAuditAction, logger } from "./lib/utils/logger";

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
    logger.warn(
      `Invalid ${envVarName}: '${envValue}'. Using default: ${defaultValue}`
    );
    return defaultValue;
  }

  return parsedValue;
}

/**
 * Cache Configuration Strategy:
 *
 * This middleware implements a caching strategy for performance and security:
 *
 * CACHE_TTL_SECONDS (default: 60 seconds):
 * - Used for regular user data caching in middlewareLoggedIn
 * - Provides performance benefits for non-admin operations
 * - Configurable via environment variable
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
 */
// Cache configuration - configurable TTL in seconds
// CACHE_TTL_SECONDS: Default cache TTL for regular user data (default: 60 seconds)
const CACHE_TTL_SECONDS = getCacheTTLFromEnv("CACHE_TTL_SECONDS", 60);

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

/**
 * Safely masks a username to protect PII while maintaining some identifiability for logging.
 * For short usernames (under 4 characters), returns a fixed mask to prevent exposure.
 * For longer usernames, uses partial masking (first 2 + last 2 characters).
 * @param username The username to mask
 * @returns The masked username
 */
function maskUsername(username: string): string {
  if (username.length < 4) {
    // For short usernames, use a fixed mask to prevent exposure
    return "***";
  }
  // For longer usernames, use partial masking
  return `${username.substring(0, 2)}***${username.substring(
    username.length - 2
  )}`;
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
 * @param bypassCache If true, always fetch fresh data bypassing cache
 * @returns Promise<User> - The user data
 * @throws Error if user not found
 */
async function getCachedOrFetchUser(
  userName: string,
  bypassCache: boolean = false
): Promise<User> {
  const cacheKey = userName;
  const currentTime = Date.now();

  // Check if we have cached user data (skip if bypassCache is true)
  if (!bypassCache) {
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
  }

  // Cache miss or expired - fetch fresh user data
  // Check if there's already a pending request for this user
  if (!pendingRequests[cacheKey]) {
    // No pending request, create one
    pendingRequests[cacheKey] = getUserByName(userName)
      .then((user) => {
        // Clean up pending request on success
        delete pendingRequests[cacheKey];
        if (!user) {
          // If user doesn't exist, create them automatically
          return createUser(userName);
        }
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
    const maskedUsername = maskUsername(userName);
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
    timestamp: Date.now(),
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
    const freshUser = await getCachedOrFetchUser(currentUserName, true);

    // Check if user is admin using fresh data
    if (!freshUser.isAdmin) {
      // Log diagnostic information without exposing PII
      const maskedUsername = maskUsername(currentUserName);
      logAuditAction(
        "UNAUTHORIZED_ADMIN_ACCESS",
        maskedUsername,
        `Unauthorized admin access attempt by masked username: ${maskedUsername}`
      );
      throw new Error("User not authorized for admin commands");
    }

    // Update cache with fresh data for future requests
    // This ensures subsequent requests can benefit from caching while current request always uses fresh data
    userCache[cacheKey] = {
      user: freshUser,
      timestamp: Date.now(),
      configUserName: currentUserName,
    };

    // Always pass fresh user data to handler to ensure consistency
    return handler(cmdName, freshUser, ...args);
  };
};
