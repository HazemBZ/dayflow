CREATE TABLE `canvas_todo_nodes` (
	`canvas_id` text NOT NULL,
	`todo_id` text NOT NULL,
	`x` real DEFAULT 0 NOT NULL,
	`y` real DEFAULT 0 NOT NULL,
	`frame_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`canvas_id`, `todo_id`)
);
