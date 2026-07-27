CREATE TABLE `canvas_edges` (
	`id` text PRIMARY KEY NOT NULL,
	`source_note_id` text NOT NULL,
	`target_note_id` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `canvas_edges_source_note_id_target_note_id_unique` ON `canvas_edges` (`source_note_id`,`target_note_id`);--> statement-breakpoint
CREATE TABLE `canvas_nodes` (
	`note_id` text PRIMARY KEY NOT NULL,
	`x` real DEFAULT 0 NOT NULL,
	`y` real DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
