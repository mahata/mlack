CREATE TABLE `direct_conversations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`user1_email` text NOT NULL,
	`user2_email` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `direct_conversations_workspace_users_unique` ON `direct_conversations` (`workspace_id`,`user1_email`,`user2_email`);--> statement-breakpoint
CREATE TABLE `direct_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content` text NOT NULL,
	`user_email` text NOT NULL,
	`user_name` text,
	`conversation_id` integer NOT NULL,
	`attachment_key` text,
	`attachment_name` text,
	`attachment_type` text,
	`attachment_size` integer,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`conversation_id`) REFERENCES `direct_conversations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `direct_messages_created_at_idx` ON `direct_messages` (`created_at`);--> statement-breakpoint
CREATE INDEX `direct_messages_conversation_id_created_at_idx` ON `direct_messages` (`conversation_id`,`created_at`);