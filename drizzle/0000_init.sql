CREATE TABLE `apps` (
	`id` text PRIMARY KEY NOT NULL,
	`app_key` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `apps_app_key_unique` ON `apps` (`app_key`);--> statement-breakpoint
CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`update_id` text NOT NULL,
	`s3_key` text NOT NULL,
	`hash` text NOT NULL,
	`key` text NOT NULL,
	`file_extension` text NOT NULL,
	`content_type` text,
	`size` integer,
	FOREIGN KEY (`update_id`) REFERENCES `updates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `channel_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`update_id` text NOT NULL,
	`runtime_version` text NOT NULL,
	`rollout_percent` real DEFAULT 100 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`update_id`) REFERENCES `updates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ca_app_channel_rv_unique` ON `channel_assignments` (`app_id`,`channel_id`,`runtime_version`);--> statement-breakpoint
CREATE TABLE `channels` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `channels_app_id_name_unique` ON `channels` (`app_id`,`name`);--> statement-breakpoint
CREATE TABLE `rollback_history` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`from_update_id` text NOT NULL,
	`to_update_id` text NOT NULL,
	`reason` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`from_update_id`) REFERENCES `updates`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_update_id`) REFERENCES `updates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `updates` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`update_group_id` text NOT NULL,
	`runtime_version` text NOT NULL,
	`platform` text NOT NULL,
	`bundle_s3_key` text NOT NULL,
	`bundle_hash` text NOT NULL,
	`bundle_size` integer,
	`enabled` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `updates_app_rv_platform_created` ON `updates` (`app_id`,`runtime_version`,`platform`,`created_at`);--> statement-breakpoint
CREATE INDEX `updates_update_group_id` ON `updates` (`update_group_id`);