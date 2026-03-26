import { index, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    content: text("content").notNull(),
    userEmail: varchar("user_email", { length: 255 }).notNull(),
    userName: varchar("user_name", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("messages_created_at_idx").on(table.createdAt)],
);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
