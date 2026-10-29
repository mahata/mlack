-- Collapse to a single shared space: keep only data from the default workspace
PRAGMA defer_foreign_keys = on;
--> statement-breakpoint
DELETE FROM `messages`
WHERE `channel_id` IN (
	SELECT `id` FROM `channels`
	WHERE `workspace_id` NOT IN (SELECT `id` FROM `workspaces` WHERE `slug` = 'default')
);
--> statement-breakpoint
DELETE FROM `channel_members`
WHERE `channel_id` IN (
	SELECT `id` FROM `channels`
	WHERE `workspace_id` NOT IN (SELECT `id` FROM `workspaces` WHERE `slug` = 'default')
);
--> statement-breakpoint
DELETE FROM `direct_messages`
WHERE `conversation_id` IN (
	SELECT `id` FROM `direct_conversations`
	WHERE `workspace_id` NOT IN (SELECT `id` FROM `workspaces` WHERE `slug` = 'default')
);
--> statement-breakpoint
CREATE TABLE `channels_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_by_email` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
INSERT INTO `channels_new` (`id`, `name`, `created_by_email`, `created_at`)
SELECT `id`, `name`, `created_by_email`, `created_at` FROM `channels`
WHERE `workspace_id` IN (SELECT `id` FROM `workspaces` WHERE `slug` = 'default');
--> statement-breakpoint
DROP TABLE `channels`;
--> statement-breakpoint
ALTER TABLE `channels_new` RENAME TO `channels`;
--> statement-breakpoint
CREATE UNIQUE INDEX `channels_name_unique` ON `channels` (`name`);
--> statement-breakpoint
CREATE TABLE `direct_conversations_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user1_email` text NOT NULL,
	`user2_email` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
INSERT INTO `direct_conversations_new` (`id`, `user1_email`, `user2_email`, `created_at`)
SELECT `id`, `user1_email`, `user2_email`, `created_at` FROM `direct_conversations`
WHERE `workspace_id` IN (SELECT `id` FROM `workspaces` WHERE `slug` = 'default');
--> statement-breakpoint
DROP TABLE `direct_conversations`;
--> statement-breakpoint
ALTER TABLE `direct_conversations_new` RENAME TO `direct_conversations`;
--> statement-breakpoint
CREATE UNIQUE INDEX `direct_conversations_users_unique` ON `direct_conversations` (`user1_email`,`user2_email`);
--> statement-breakpoint
DROP TABLE `workspace_invites`;
--> statement-breakpoint
DROP TABLE `workspace_members`;
--> statement-breakpoint
DROP TABLE `workspaces`;
--> statement-breakpoint
PRAGMA defer_foreign_keys = off;
