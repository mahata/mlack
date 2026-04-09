ALTER TABLE `messages` ADD `attachment_key` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `attachment_name` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `attachment_type` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `attachment_size` integer;--> statement-breakpoint
CREATE INDEX `pending_registrations_expires_at_idx` ON `pending_registrations` (`expires_at`);