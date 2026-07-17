CREATE TABLE `outcome_subtasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`outcome_index` integer NOT NULL,
	`text` text NOT NULL,
	`completed` integer DEFAULT false,
	`sort_order` integer DEFAULT 0,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
