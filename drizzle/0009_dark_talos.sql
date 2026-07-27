CREATE TABLE `canvas_frames` (
	`id` text PRIMARY KEY NOT NULL,
	`canvas_id` text NOT NULL,
	`name` text DEFAULT 'Frame' NOT NULL,
	`x` real DEFAULT 0 NOT NULL,
	`y` real DEFAULT 0 NOT NULL,
	`width` real DEFAULT 400 NOT NULL,
	`height` real DEFAULT 300 NOT NULL,
	`color` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `canvas_nodes` ADD `frame_id` text;