ALTER TABLE `canvases` ADD `position` integer;--> statement-breakpoint
WITH ranked_canvases AS (
	SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) - 1 AS position
	FROM canvases
)
UPDATE canvases
SET position = (
	SELECT position
	FROM ranked_canvases
	WHERE ranked_canvases.id = canvases.id
);
