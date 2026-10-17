CREATE TABLE `inquiries` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`business` text NOT NULL,
	`location` text NOT NULL,
	`phone` text NOT NULL,
	`email` text,
	`task` text NOT NULL,
	`current_process` text,
	`source` text NOT NULL,
	`created_at` integer NOT NULL
);
