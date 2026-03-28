import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const channels = sqliteTable("channels", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  createdByEmail: text("created_by_email").notNull(),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const channelMembers = sqliteTable(
  "channel_members",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    channelId: integer("channel_id")
      .notNull()
      .references(() => channels.id),
    userEmail: text("user_email").notNull(),
    joinedAt: text("joined_at").default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [uniqueIndex("channel_members_channel_id_user_email_unique").on(table.channelId, table.userEmail)],
);

export const messages = sqliteTable(
  "messages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    content: text("content").notNull(),
    userEmail: text("user_email").notNull(),
    userName: text("user_name"),
    channelId: integer("channel_id")
      .notNull()
      .references(() => channels.id),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    index("messages_created_at_idx").on(table.createdAt),
    index("messages_channel_id_created_at_idx").on(table.channelId, table.createdAt),
  ],
);

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const pendingRegistrations = sqliteTable("pending_registrations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  verificationCode: text("verification_code").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});
