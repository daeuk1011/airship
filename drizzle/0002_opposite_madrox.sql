CREATE TABLE `api_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`token_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_used_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_tokens_token_hash_unique` ON `api_tokens` (`token_hash`);--> statement-breakpoint
DROP INDEX `ca_app_channel_rv_unique`;--> statement-breakpoint
ALTER TABLE `channel_assignments` ADD `platform` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `ca_app_channel_rv_platform_unique` ON `channel_assignments` (`app_id`,`channel_id`,`runtime_version`,`platform`);