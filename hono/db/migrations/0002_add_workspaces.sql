-- Create workspaces table
CREATE TABLE `workspaces` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`created_by_email` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspaces_slug_unique` ON `workspaces` (`slug`);
--> statement-breakpoint
-- Create workspace_members table
CREATE TABLE `workspace_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`user_email` text NOT NULL,
	`role` text NOT NULL DEFAULT 'member',
	`joined_at` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_members_workspace_id_user_email_unique` ON `workspace_members` (`workspace_id`,`user_email`);
--> statement-breakpoint
-- Create workspace_invites table
CREATE TABLE `workspace_invites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workspace_id` integer NOT NULL,
	`code` text NOT NULL,
	`created_by_email` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_invites_code_unique` ON `workspace_invites` (`code`);
--> statement-breakpoint
CREATE INDEX `workspace_invites_expires_at_idx` ON `workspace_invites` (`expires_at`);
--> statement-breakpoint
-- Seed default workspace
INSERT INTO `workspaces` (`name`, `slug`, `created_by_email`) VALUES ('Default', 'default', 'system');
--> statement-breakpoint
-- Recreate channels table with workspace_id (SQLite doesn't support ALTER COLUMN ADD NOT NULL)
CREATE TABLE `channels_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`workspace_id` integer NOT NULL,
	`created_by_email` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
-- Migrate existing channels to default workspace (id=1)
INSERT INTO `channels_new` (`id`, `name`, `workspace_id`, `created_by_email`, `created_at`)
SELECT `id`, `name`, 1, `created_by_email`, `created_at` FROM `channels`;
--> statement-breakpoint
-- Defer foreign key checks for the table rebuild (channel_members and messages reference channels)
PRAGMA defer_foreign_keys = on;
--> statement-breakpoint
-- Drop old channels table and rename new one
DROP TABLE `channels`;
--> statement-breakpoint
ALTER TABLE `channels_new` RENAME TO `channels`;
--> statement-breakpoint
-- Recreate indexes on channels (old unique on name is replaced with workspace-scoped unique)
CREATE UNIQUE INDEX `channels_workspace_id_name_unique` ON `channels` (`workspace_id`,`name`);
--> statement-breakpoint
PRAGMA defer_foreign_keys = off;
--> statement-breakpoint
-- Migrate existing channel members into workspace_members for the default workspace
INSERT OR IGNORE INTO `workspace_members` (`workspace_id`, `user_email`, `role`)
SELECT DISTINCT 1, `user_email`, 'member' FROM `channel_members`;
--> statement-breakpoint
-- Make the first workspace member (if any) an admin; otherwise the system user stays as creator
UPDATE `workspace_members` SET `role` = 'admin'
WHERE `workspace_id` = 1 AND `id` = (
  SELECT MIN(`id`) FROM `workspace_members` WHERE `workspace_id` = 1
);
