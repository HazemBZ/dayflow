CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`project_name` text NOT NULL,
	`project_path` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `projects_project_name_unique` ON `projects` (`project_name`);--> statement-breakpoint
CREATE UNIQUE INDEX `projects_project_path_unique` ON `projects` (`project_path`);--> statement-breakpoint
ALTER TABLE `todos` ADD `project_id` text REFERENCES projects(id) ON DELETE SET NULL;
