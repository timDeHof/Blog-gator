"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.feed_follows = exports.feeds = exports.users = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom().notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at")
        .notNull()
        .defaultNow()
        .$onUpdate(function () { return new Date(); }),
    name: (0, pg_core_1.text)("name").notNull().unique(),
    isAdmin: (0, pg_core_1.boolean)("is_admin").notNull().default(false),
});
exports.feeds = (0, pg_core_1.pgTable)("feeds", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom().notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at")
        .notNull()
        .defaultNow()
        .$onUpdate(function () { return new Date(); }),
    name: (0, pg_core_1.text)("name").notNull().unique(),
    url: (0, pg_core_1.text)("url").notNull().unique(),
    user_id: (0, pg_core_1.uuid)("user_id")
        .references(function () { return exports.users.id; }, { onDelete: "cascade" })
        .notNull(),
});
exports.feed_follows = (0, pg_core_1.pgTable)("feed_follows", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom().notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at")
        .notNull()
        .defaultNow()
        .$onUpdate(function () { return new Date(); }),
    feed_id: (0, pg_core_1.uuid)("feed_id")
        .references(function () { return exports.feeds.id; }, { onDelete: "cascade" })
        .notNull(),
    user_id: (0, pg_core_1.uuid)("user_id")
        .references(function () { return exports.users.id; }, { onDelete: "cascade" })
        .notNull(),
}, function (table) {
    return {
        uniqueUserFeedPair: (0, pg_core_1.unique)().on(table.user_id, table.feed_id),
        feedIdIndex: (0, pg_core_1.index)("feed_id_idx").on(table.feed_id),
    };
});
