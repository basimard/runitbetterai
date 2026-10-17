CREATE TABLE `calls` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text NOT NULL,
	`starts_at` integer NOT NULL,
	`timezone` text NOT NULL,
	`duration` integer NOT NULL,
	`status` text DEFAULT 'Scheduled' NOT NULL,
	`agenda` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`contact_id`) REFERENCES `inquiries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `contact_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`contact_id`) REFERENCES `inquiries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `inquiries` ADD `stage` text DEFAULT 'New' NOT NULL;--> statement-breakpoint
ALTER TABLE `inquiries` ADD `timezone` text DEFAULT 'UTC' NOT NULL;