ALTER TABLE `request_stage_tracking` MODIFY COLUMN `startedAt` datetime DEFAULT (now());--> statement-breakpoint
ALTER TABLE `request_stage_tracking` MODIFY COLUMN `dueAt` datetime;