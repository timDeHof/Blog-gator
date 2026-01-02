import { User } from "./lib/db/schema";
import { CommandHandler } from "./commands/commands";
import { readConfig } from "./config";
import { getUserByName } from "./lib/db/queries/users";

// Cache configuration - configurable TTL in seconds
const CACHE_TTL_SECONDS = 60; // Default: 60 seconds

// In-memory cache structure
interface UserCacheEntry {
  user: User;
  timestamp: number; // Unix timestamp in milliseconds
  configUserName: string; // The username from config when cached
}

// Cache storage
const userCache: Record<string, UserCacheEntry> = {};

type UserCommandHandler = (
  cmdName: string,
  user: User,
  ...args: string[]
) => Promise<void>;

export const middlewareLoggedIn = (
  handler: UserCommandHandler
): CommandHandler => {
  return async (cmdName: string, ...args: string[]) => {
    const config = readConfig();

    // Validate config and currentUserName before calling getUserByName
    if (
      !config ||
      !config.currentUserName ||
      typeof config.currentUserName !== "string" ||
      config.currentUserName.trim() === ""
    ) {
      throw new Error(
        `Missing or invalid currentUserName in config. Config: ${JSON.stringify(
          config
        )}`
      );
    }

    const cacheKey = config.currentUserName;
    const currentTime = Date.now();

    // Check if we have cached user data
    const cachedEntry = userCache[cacheKey];

    if (cachedEntry) {
      // Check if cache is still valid (not expired)
      const cacheAgeSeconds = (currentTime - cachedEntry.timestamp) / 1000;

      if (cacheAgeSeconds < CACHE_TTL_SECONDS) {
        // Cache is valid, but check if config username changed
        // (this shouldn't happen normally, but good to be defensive)
        if (cachedEntry.configUserName === config.currentUserName) {
          // Return cached user
          return handler(cmdName, cachedEntry.user, ...args);
        }
      }
    }

    // Cache miss or expired - fetch fresh user data
    const user = await getUserByName(config.currentUserName);

    if (!user) {
      throw new Error(`User ${config.currentUserName} not found`);
    }

    // Update cache with fresh data
    userCache[cacheKey] = {
      user,
      timestamp: currentTime,
      configUserName: config.currentUserName,
    };

    return handler(cmdName, user, ...args);
  };
};

export const middlewareAdminOnly = (
  handler: UserCommandHandler
): CommandHandler => {
  return async (cmdName: string, ...args: string[]) => {
    const config = readConfig();

    // Validate config and currentUserName before calling getUserByName
    if (
      !config ||
      !config.currentUserName ||
      typeof config.currentUserName !== "string" ||
      config.currentUserName.trim() === ""
    ) {
      throw new Error(
        `Missing or invalid currentUserName in config. Config: ${JSON.stringify(
          config
        )}`
      );
    }

    const cacheKey = config.currentUserName;
    const currentTime = Date.now();

    // Check if we have cached user data
    const cachedEntry = userCache[cacheKey];

    if (cachedEntry) {
      // Check if cache is still valid (not expired)
      const cacheAgeSeconds = (currentTime - cachedEntry.timestamp) / 1000;

      if (cacheAgeSeconds < CACHE_TTL_SECONDS) {
        // Cache is valid, but check if config username changed
        // (this shouldn't happen normally, but good to be defensive)
        if (cachedEntry.configUserName === config.currentUserName) {
          // Check if user is admin
          if (cachedEntry.user.isAdmin !== "true") {
            throw new Error(
              `User ${config.currentUserName} is not authorized for admin commands`
            );
          }
          // Return cached user
          return handler(cmdName, cachedEntry.user, ...args);
        }
      }
    }

    // Cache miss or expired - fetch fresh user data
    const user = await getUserByName(config.currentUserName);

    if (!user) {
      throw new Error(`User ${config.currentUserName} not found`);
    }

    // Check if user is admin
    if (user.isAdmin !== "true") {
      throw new Error(
        `User ${config.currentUserName} is not authorized for admin commands`
      );
    }

    // Update cache with fresh data
    userCache[cacheKey] = {
      user,
      timestamp: currentTime,
      configUserName: config.currentUserName,
    };

    return handler(cmdName, user, ...args);
  };
};
