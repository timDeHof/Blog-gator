"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDatabaseError = isDatabaseError;
exports.extractConstraintName = extractConstraintName;
exports.isCustomError = isCustomError;
exports.createFeedFollow = createFeedFollow;
exports.getFeedFollowsForUser = getFeedFollowsForUser;
exports.deleteFeedFollow = deleteFeedFollow;
var __1 = require("..");
var drizzle_orm_1 = require("drizzle-orm");
var schema_1 = require("../schema");
var logger_1 = require("../../logger");
var sanitizer_1 = require("../../sanitizer");
/**
 * Type guard to check if an error is a database error with a code property
 */
function isDatabaseError(error) {
    return (error &&
        typeof error === "object" &&
        "code" in error &&
        typeof error.code === "string");
}
/**
 * Type guard to check if an error is a custom application error
 * Since we don't have custom error classes, this is a placeholder for future use
 */
function isCustomError(error) {
    // TODO: Implement proper custom error type guard
    // This should check for custom error properties or use instanceof when CustomError class is defined
    // For now, this is intentionally dormant as no custom errors are implemented yet
    return false;
}
/**
 * Extract constraint name from database error message
 */
function extractConstraintName(error) {
    // Try to extract constraint name from error message
    var constraintMatch = error.message.match(/constraint\s+[`""]([^`""]+)[`""]/i);
    if (constraintMatch && constraintMatch[1]) {
        return constraintMatch[1];
    }
    // Try to extract from constraint name property if available
    if (error.constraint) {
        return error.constraint;
    }
    return null;
}
// Helper function to sanitize errors for logging
function sanitizeErrorForLogging(error) {
    var sanitizer = sanitizer_1.InputSanitizer.createDefault();
    try {
        // Convert error to string representation
        var errorString = void 0;
        if (error instanceof Error) {
            // For Error objects, create a sanitized version
            errorString = "Error: ".concat(error.message);
            // Remove sensitive information like SQL, constraint names, and stack traces
            errorString = errorString
                .replace(/\bconstraint\b\s+[`""]([^`""]+)[`""]/gi, "constraint [REDACTED]")
                .replace(/\b(WHERE|FROM|INSERT|UPDATE|DELETE|SELECT)\b/gi, "[SQL_REDACTED]")
                .replace(/\b(feeds|users|feed_follows)\b/gi, "[TABLE_REDACTED]")
                .replace(/\b(feed_id|user_id)\b/gi, "[COLUMN_REDACTED]");
        }
        else {
            // For non-Error objects, convert to string and sanitize
            errorString = String(error);
            errorString = sanitizer.sanitizeString(errorString, "error", {
                allowEmpty: true,
            });
        }
        return errorString;
    }
    catch (sanitizeError) {
        // If sanitization fails, return a safe fallback
        return "[ERROR_SANITIZATION_FAILED]";
    }
}
function createFeedFollow(feedId, actorId) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, __1.db.transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                        var newFeedFollow, result, followData, error_1, errorId_1, sanitizedError_1, dbError, constraintName, errorId, sanitizedError;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    _a.trys.push([0, 3, , 4]);
                                    return [4 /*yield*/, tx
                                            .insert(schema_1.feed_follows)
                                            .values({
                                            feed_id: feedId,
                                            user_id: actorId,
                                        })
                                            .returning()];
                                case 1:
                                    newFeedFollow = (_a.sent())[0];
                                    return [4 /*yield*/, tx
                                            .select({
                                            feed_follow_id: schema_1.feed_follows.id,
                                            feed_follow_created_at: schema_1.feed_follows.createdAt,
                                            feed_follow_updated_at: schema_1.feed_follows.updatedAt,
                                            feed_id: schema_1.feeds.id,
                                            feed_name: schema_1.feeds.name,
                                            feed_url: schema_1.feeds.url,
                                            user_id: schema_1.users.id,
                                            user_name: schema_1.users.name,
                                        })
                                            .from(schema_1.feed_follows)
                                            .innerJoin(schema_1.feeds, (0, drizzle_orm_1.eq)(schema_1.feed_follows.feed_id, schema_1.feeds.id))
                                            .innerJoin(schema_1.users, (0, drizzle_orm_1.eq)(schema_1.feed_follows.user_id, schema_1.users.id))
                                            .where((0, drizzle_orm_1.eq)(schema_1.feed_follows.id, newFeedFollow.id))
                                            .limit(1)];
                                case 2:
                                    result = _a.sent();
                                    followData = result[0];
                                    // Check if result exists (basic safety check)
                                    if (!followData) {
                                        throw new Error("Failed to retrieve created feed follow");
                                    }
                                    return [2 /*return*/, followData];
                                case 3:
                                    error_1 = _a.sent();
                                    // TODO: Check if this is a custom error and re-throw it unchanged
                                    // This is intentionally dormant until custom error classes are implemented
                                    if (error_1 instanceof Error && isCustomError(error_1)) {
                                        throw error_1;
                                    }
                                    // Normalize non-Error throwables to Error
                                    if (!(error_1 instanceof Error)) {
                                        errorId_1 = Date.now().toString(36) + Math.random().toString(36).substring(2);
                                        sanitizedError_1 = sanitizeErrorForLogging(error_1);
                                        // Environment-aware logging
                                        if (process.env.NODE_ENV !== "production") {
                                            logger_1.logger.error("Unexpected error in createFeedFollow (ID: ".concat(errorId_1, "): ").concat(sanitizedError_1), {
                                                errorId: errorId_1,
                                                context: "createFeedFollow",
                                                fullError: error_1,
                                            });
                                        }
                                        else {
                                            logger_1.logger.error("Unexpected error in createFeedFollow (ID: ".concat(errorId_1, "): [ERROR_REDACTED]"), {
                                                errorId: errorId_1,
                                                context: "createFeedFollow",
                                            });
                                        }
                                        throw new Error("An unexpected error occurred while creating the feed follow");
                                    }
                                    // Use typed guards to check for database error codes
                                    if (isDatabaseError(error_1)) {
                                        dbError = error_1;
                                        // Handle unique constraint violation (PostgreSQL error code 23505)
                                        if (dbError.code === "23505") {
                                            throw new Error("You are already following this feed");
                                        }
                                        // Handle foreign key violations (PostgreSQL error code 23503)
                                        if (dbError.code === "23503") {
                                            constraintName = extractConstraintName(dbError);
                                            if (constraintName) {
                                                if (constraintName.includes("feed_id") ||
                                                    constraintName.includes("feeds")) {
                                                    throw new Error("Feed not found");
                                                }
                                                else if (constraintName.includes("user_id") ||
                                                    constraintName.includes("users")) {
                                                    throw new Error("User not found");
                                                }
                                            }
                                            throw new Error("Referenced resource not found");
                                        }
                                    }
                                    errorId = Date.now().toString(36) + Math.random().toString(36).substring(2);
                                    sanitizedError = sanitizeErrorForLogging(error_1);
                                    // Environment-aware logging
                                    if (process.env.NODE_ENV !== "production") {
                                        logger_1.logger.error("Database error in createFeedFollow (ID: ".concat(errorId, "): ").concat(sanitizedError), {
                                            errorId: errorId,
                                            context: "createFeedFollow",
                                            fullError: error_1,
                                        });
                                    }
                                    else {
                                        logger_1.logger.error("Database error in createFeedFollow (ID: ".concat(errorId, "): [ERROR_REDACTED]"), {
                                            errorId: errorId,
                                            context: "createFeedFollow",
                                        });
                                    }
                                    throw new Error("Failed to create feed follow due to a database error");
                                case 4: return [2 /*return*/];
                            }
                        });
                    }); })];
                case 1: 
                // Use a transaction to ensure atomicity of insert + select
                return [2 /*return*/, _a.sent()];
            }
        });
    });
}
function getFeedFollowsForUser(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, __1.db
                        .select({
                        feed_follow_id: schema_1.feed_follows.id,
                        feed_follow_created_at: schema_1.feed_follows.createdAt,
                        feed_follow_updated_at: schema_1.feed_follows.updatedAt,
                        feed_id: schema_1.feeds.id,
                        feed_name: schema_1.feeds.name,
                        feed_url: schema_1.feeds.url,
                        user_id: schema_1.feed_follows.user_id,
                    })
                        .from(schema_1.feed_follows)
                        .innerJoin(schema_1.feeds, (0, drizzle_orm_1.eq)(schema_1.feed_follows.feed_id, schema_1.feeds.id))
                        .where((0, drizzle_orm_1.eq)(schema_1.feed_follows.user_id, userId))
                        .orderBy(schema_1.feeds.name)];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result];
            }
        });
    });
}
function deleteFeedFollow(userId, feedUrl) {
    return __awaiter(this, void 0, void 0, function () {
        var feed, feedId, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, __1.db
                        .select({ id: schema_1.feeds.id })
                        .from(schema_1.feeds)
                        .where((0, drizzle_orm_1.eq)(schema_1.feeds.url, feedUrl))
                        .limit(1)];
                case 1:
                    feed = _a.sent();
                    if (!feed || feed.length === 0) {
                        throw new Error("Feed not found");
                    }
                    feedId = feed[0].id;
                    return [4 /*yield*/, __1.db
                            .delete(schema_1.feed_follows)
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.feed_follows.user_id, userId), (0, drizzle_orm_1.eq)(schema_1.feed_follows.feed_id, feedId)))];
                case 2:
                    result = _a.sent();
                    if (result.count === 0) {
                        throw new Error("Feed follow record not found or already deleted");
                    }
                    return [2 /*return*/];
            }
        });
    });
}
