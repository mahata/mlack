CREATE TABLE `user_feature_flags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_email` text NOT NULL,
	`flag_key` text NOT NULL,
	`flag_value` text NOT NULL,
	`granted_by` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_feature_flags_email_key_unique` ON `user_feature_flags` (`user_email`,`flag_key`);
