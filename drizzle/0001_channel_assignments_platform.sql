PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_channel_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` text NOT NULL,
	`channel_id` text NOT NULL,
	`update_id` text NOT NULL,
	`runtime_version` text NOT NULL,
	`platform` text NOT NULL,
	`rollout_percent` real DEFAULT 100 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`channel_id`) REFERENCES `channels`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`update_id`) REFERENCES `updates`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_channel_assignments` (
	`id`,
	`app_id`,
	`channel_id`,
	`update_id`,
	`runtime_version`,
	`platform`,
	`rollout_percent`,
	`updated_at`
)
SELECT
	ca.`id`,
	ca.`app_id`,
	ca.`channel_id`,
	ca.`update_id`,
	ca.`runtime_version`,
	u.`platform`,
	ca.`rollout_percent`,
	ca.`updated_at`
FROM `channel_assignments` ca
JOIN `updates` u ON u.`id` = ca.`update_id`;
--> statement-breakpoint
DROP TABLE `channel_assignments`;
--> statement-breakpoint
ALTER TABLE `__new_channel_assignments` RENAME TO `channel_assignments`;
--> statement-breakpoint
CREATE UNIQUE INDEX `ca_app_channel_rv_platform_unique` ON `channel_assignments` (`app_id`,`channel_id`,`runtime_version`,`platform`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
