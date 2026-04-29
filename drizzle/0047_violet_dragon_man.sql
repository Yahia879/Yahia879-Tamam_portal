ALTER TABLE `request_history` MODIFY COLUMN `fromStage` varchar(50);--> statement-breakpoint
ALTER TABLE `request_history` MODIFY COLUMN `toStage` varchar(50);--> statement-breakpoint
ALTER TABLE `request_history` MODIFY COLUMN `fromStatus` varchar(50);--> statement-breakpoint
ALTER TABLE `request_history` MODIFY COLUMN `toStatus` varchar(50);