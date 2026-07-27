CREATE TABLE `canvases` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `canvases` (`id`, `name`, `created_at`, `updated_at`)
VALUES ('default_main_canvas', 'Main Canvas', 0, 0);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_canvas_nodes` (
	`canvas_id` text NOT NULL DEFAULT 'default_main_canvas',
	`note_id` text NOT NULL,
	`x` real DEFAULT 0 NOT NULL,
	`y` real DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`canvas_id`, `note_id`)
);
--> statement-breakpoint
INSERT INTO `__new_canvas_nodes`(`canvas_id`, `note_id`, `x`, `y`, `updated_at`)
SELECT 'default_main_canvas', `note_id`, `x`, `y`, `updated_at` FROM `canvas_nodes`;
--> statement-breakpoint
DROP TABLE `canvas_nodes`;
--> statement-breakpoint
ALTER TABLE `__new_canvas_nodes` RENAME TO `canvas_nodes`;
--> statement-breakpoint
DROP INDEX IF EXISTS `canvas_edges_source_note_id_target_note_id_unique`;
--> statement-breakpoint
CREATE TABLE `__new_canvas_edges` (
	`id` text PRIMARY KEY NOT NULL,
	`canvas_id` text NOT NULL DEFAULT 'default_main_canvas',
	`source_note_id` text NOT NULL,
	`target_note_id` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_canvas_edges`(`id`, `canvas_id`, `source_note_id`, `target_note_id`, `updated_at`)
SELECT `id`, 'default_main_canvas', `source_note_id`, `target_note_id`, `updated_at` FROM `canvas_edges`;
--> statement-breakpoint
DROP TABLE `canvas_edges`;
--> statement-breakpoint
ALTER TABLE `__new_canvas_edges` RENAME TO `canvas_edges`;
--> statement-breakpoint
CREATE UNIQUE INDEX `canvas_edges_canvas_id_source_note_id_target_note_id_unique` ON `canvas_edges` (`canvas_id`,`source_note_id`,`target_note_id`);
--> statement-breakpoint
PRAGMA foreign_keys=ON;
