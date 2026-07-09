CREATE TABLE `bug_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`bookmarked` integer DEFAULT false,
	`severity` text DEFAULT 'medium',
	`status` text DEFAULT 'open'
);
