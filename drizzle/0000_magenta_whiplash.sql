CREATE TABLE `daily_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`outcome_1` text,
	`outcome_2` text,
	`outcome_3` text,
	`deep_work_topic` text,
	`deep_work_completed` integer DEFAULT false,
	`deep_work_duration` integer,
	`evening_task_type` text,
	`evening_completed` integer DEFAULT false,
	`notes` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_logs_date_unique` ON `daily_logs` (`date`);--> statement-breakpoint
CREATE TABLE `immigration_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`company` text NOT NULL,
	`role` text,
	`stage` text DEFAULT 'saved' NOT NULL,
	`target_country` text,
	`date_applied` text,
	`next_follow_up` text,
	`notes` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `protection_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`request_description` text NOT NULL,
	`action_taken` text NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `quarterly_reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`quarter` integer NOT NULL,
	`year` integer NOT NULL,
	`market_value_stronger` integer,
	`cloud_skills_stronger` integer,
	`leadership_experience_better` integer,
	`interview_performance_better` integer,
	`recruiter_responses` integer,
	`interviews_received` integer,
	`sponsorship_opportunities` integer,
	`strategy_changed` integer DEFAULT false,
	`notes` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `showcase_milestones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`completed` integer DEFAULT false,
	`completed_date` text,
	`notes` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `skill_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`skill` text NOT NULL,
	`duration_minutes` integer NOT NULL,
	`completed` integer DEFAULT true,
	`notes` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `time_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`category` text NOT NULL,
	`hours` real NOT NULL,
	`description` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `weekly_plans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`week_start` text NOT NULL,
	`apps_target` integer DEFAULT 10,
	`networking_target` integer DEFAULT 2,
	`learning_hours_target` real DEFAULT 5,
	`project_hours_target` real DEFAULT 2,
	`ai_exploration_hours_target` real DEFAULT 2,
	`terraform_hours` real DEFAULT 2,
	`aws_hours` real DEFAULT 2,
	`k8s_hours` real DEFAULT 1,
	`leadership_improvement` text,
	`leadership_completed` integer DEFAULT false,
	`notes` text,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE UNIQUE INDEX `weekly_plans_week_start_unique` ON `weekly_plans` (`week_start`);--> statement-breakpoint
CREATE TABLE `weekly_scores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`week_start` text NOT NULL,
	`applications_submitted` integer DEFAULT 0,
	`networking_conversations` integer DEFAULT 0,
	`learning_hours` real DEFAULT 0,
	`showcase_project_hours` real DEFAULT 0,
	`leadership_improved` integer DEFAULT false,
	`ai_exploration_hours` real DEFAULT 0,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE UNIQUE INDEX `weekly_scores_week_start_unique` ON `weekly_scores` (`week_start`);