CREATE TABLE `page_activations` (
	`route` text PRIMARY KEY NOT NULL,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
INSERT INTO `page_activations` (`route`, `active`) VALUES
	('/todos', true),
	('/weekly', true),
	('/scorecard', true),
	('/horizon', true),
	('/budget', true),
	('/history', true),
	('/canvas', true),
	('/notes', true)
ON CONFLICT(`route`) DO NOTHING;
