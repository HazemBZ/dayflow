CREATE TEMP TABLE `_todos_status_preflight` (
	`is_valid` integer NOT NULL CHECK (`is_valid` = 1)
);
--> statement-breakpoint
INSERT INTO `_todos_status_preflight` (`is_valid`)
SELECT CASE
	WHEN EXISTS (
		SELECT 1
		FROM `bug_notes`
		WHERE `status` IS NOT NULL
			AND `status` NOT IN ('open', 'in-progress', 'resolved', 'closed')
	) THEN 0
	ELSE 1
END;
--> statement-breakpoint
DROP TABLE `_todos_status_preflight`;
--> statement-breakpoint
ALTER TABLE `bug_notes` RENAME TO `todos`;
--> statement-breakpoint
ALTER TABLE `todos` ADD COLUMN `assigned_to` text;
--> statement-breakpoint
UPDATE `todos`
SET `status` = CASE
	WHEN `status` IS NULL THEN 'pending'
	WHEN `status` = 'open' THEN 'pending'
	WHEN `status` = 'in-progress' THEN 'in_progress'
	WHEN `status` = 'resolved' THEN 'done'
	WHEN `status` = 'closed' THEN 'cancelled'
END;
--> statement-breakpoint
CREATE TABLE `__new_todos` (
	`id` text PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`bookmarked` integer DEFAULT false,
	`severity` text DEFAULT 'medium',
	`status` text DEFAULT 'pending',
	`assigned_to` text
);
--> statement-breakpoint
INSERT INTO `__new_todos` (`id`, `text`, `created_at`, `updated_at`, `bookmarked`, `severity`, `status`, `assigned_to`)
SELECT `id`, `text`, `created_at`, `updated_at`, `bookmarked`, `severity`, `status`, `assigned_to` FROM `todos`;
--> statement-breakpoint
DROP TABLE `todos`;
--> statement-breakpoint
ALTER TABLE `__new_todos` RENAME TO `todos`;
