import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const workspaces = sqliteTable("workspaces", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdByEmail: text("created_by_email").notNull(),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const workspaceMembers = sqliteTable(
  "workspace_members",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    userEmail: text("user_email").notNull(),
    role: text("role").notNull().default("member"),
    joinedAt: text("joined_at").default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [uniqueIndex("workspace_members_workspace_id_user_email_unique").on(table.workspaceId, table.userEmail)],
);

export const workspaceInvites = sqliteTable(
  "workspace_invites",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    code: text("code").notNull().unique(),
    createdByEmail: text("created_by_email").notNull(),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [index("workspace_invites_expires_at_idx").on(table.expiresAt)],
);

export const channels = sqliteTable(
  "channels",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    createdByEmail: text("created_by_email").notNull(),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [uniqueIndex("channels_workspace_id_name_unique").on(table.workspaceId, table.name)],
);

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
    attachmentKey: text("attachment_key"),
    attachmentName: text("attachment_name"),
    attachmentType: text("attachment_type"),
    attachmentSize: integer("attachment_size"),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    index("messages_created_at_idx").on(table.createdAt),
    index("messages_channel_id_created_at_idx").on(table.channelId, table.createdAt),
  ],
);

export const directConversations = sqliteTable(
  "direct_conversations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    user1Email: text("user1_email").notNull(),
    user2Email: text("user2_email").notNull(),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    uniqueIndex("direct_conversations_workspace_users_unique").on(
      table.workspaceId,
      table.user1Email,
      table.user2Email,
    ),
  ],
);

export const directMessages = sqliteTable(
  "direct_messages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    content: text("content").notNull(),
    userEmail: text("user_email").notNull(),
    userName: text("user_name"),
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => directConversations.id),
    attachmentKey: text("attachment_key"),
    attachmentName: text("attachment_name"),
    attachmentType: text("attachment_type"),
    attachmentSize: integer("attachment_size"),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [
    index("direct_messages_created_at_idx").on(table.createdAt),
    index("direct_messages_conversation_id_created_at_idx").on(table.conversationId, table.createdAt),
  ],
);

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
});

export const pendingRegistrations = sqliteTable(
  "pending_registrations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    verificationCode: text("verification_code").notNull(),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").default(sql`(CURRENT_TIMESTAMP)`),
  },
  (table) => [index("pending_registrations_expires_at_index").on(table.expiresAt)],
);
