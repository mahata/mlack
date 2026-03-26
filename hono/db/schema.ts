import { integer, pgTable, serial, text, timestamp, unique, varchar } from "drizzle-orm/pg-core";

export const channels = pgTable("channels", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  createdByEmail: varchar("created_by_email", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const channelMembers = pgTable(
  "channel_members",
  {
    id: serial("id").primaryKey(),
    channelId: integer("channel_id")
      .notNull()
      .references(() => channels.id),
    userEmail: varchar("user_email", { length: 255 }).notNull(),
    joinedAt: timestamp("joined_at").defaultNow(),
  },
  (table) => [unique("channel_members_channel_id_user_email_unique").on(table.channelId, table.userEmail)],
);

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  userEmail: varchar("user_email", { length: 255 }).notNull(),
  userName: varchar("user_name", { length: 255 }),
  channelId: integer("channel_id")
    .notNull()
    .references(() => channels.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});