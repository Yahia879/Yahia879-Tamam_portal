CREATE TABLE `request_sub_stage_tracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`parentStageCode` varchar(50) NOT NULL,
	`subStageCode` varchar(50) NOT NULL,
	`startedAt` datetime NOT NULL DEFAULT (now()),
	`dueAt` datetime NOT NULL,
	`completedAt` datetime,
	`isDelayed` boolean DEFAULT false,
	`delayDays` int DEFAULT 0,
	`assignedTo` int,
	`completedBy` int,
	`notes` text,
	`actionData` text,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	`updatedAt` datetime NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `request_sub_stage_tracking_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `mosque_requests` MODIFY COLUMN `currentStage` enum('submitted','initial_review','field_visit','technical_eval','boq_preparation','financial_eval','quotation_approval','contracting','execution','handover','closed') NOT NULL DEFAULT 'submitted';--> statement-breakpoint
ALTER TABLE `request_history` MODIFY COLUMN `fromStage` enum('submitted','initial_review','field_visit','technical_eval','boq_preparation','financial_eval','quotation_approval','contracting','execution','handover','closed');--> statement-breakpoint
ALTER TABLE `request_history` MODIFY COLUMN `toStage` enum('submitted','initial_review','field_visit','technical_eval','boq_preparation','financial_eval','quotation_approval','contracting','execution','handover','closed');--> statement-breakpoint
ALTER TABLE `request_stage_tracking` ADD `subStageCode` varchar(50);--> statement-breakpoint
ALTER TABLE `request_sub_stage_tracking` ADD CONSTRAINT `request_sub_stage_tracking_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `request_sub_stage_tracking` ADD CONSTRAINT `request_sub_stage_tracking_assignedTo_users_id_fk` FOREIGN KEY (`assignedTo`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `request_sub_stage_tracking` ADD CONSTRAINT `request_sub_stage_tracking_completedBy_users_id_fk` FOREIGN KEY (`completedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;