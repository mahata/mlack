CREATE TABLE `pending_registrations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`verification_code` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pending_registrations_email_unique` ON `pending_registrations` (`email`);
CREATE INDEX `pending_registrations_expires_at_index` ON `pending_registrations` (`expires_at`);