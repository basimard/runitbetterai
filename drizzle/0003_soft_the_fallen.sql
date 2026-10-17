PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_crm_admin` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`salt` text NOT NULL,
	`password_hash` text NOT NULL,
	`failed_attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` integer DEFAULT 0 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_crm_admin`("id", "email", "salt", "password_hash", "failed_attempts", "locked_until", "enabled") SELECT "id", "email", "salt", "password_hash", "failed_attempts", "locked_until", 1 FROM `crm_admin`;--> statement-breakpoint
DROP TABLE `crm_admin`;--> statement-breakpoint
ALTER TABLE `__new_crm_admin` RENAME TO `crm_admin`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `crm_admin_email_unique` ON `crm_admin` (`email`);--> statement-breakpoint
ALTER TABLE `crm_sessions` ADD `admin_id` integer REFERENCES crm_admin(id);
