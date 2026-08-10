CREATE TABLE `canvas_note_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`canvas_id` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`x` real DEFAULT 0 NOT NULL,
	`y` real DEFAULT 0 NOT NULL,
	`width` real DEFAULT 280 NOT NULL,
	`height` real DEFAULT 200 NOT NULL,
	`frame_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
