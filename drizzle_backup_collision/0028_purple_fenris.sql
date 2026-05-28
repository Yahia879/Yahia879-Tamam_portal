CREATE TABLE `escalation_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`stageCode` varchar(50) NOT NULL,
	`escalationLevel` int NOT NULL,
	`escalatedTo` int NOT NULL,
	`escalatedFrom` int,
	`reason` text,
	`delayDays` int NOT NULL,
	`isResolved` boolean DEFAULT false,
	`resolvedAt` datetime,
	`resolvedBy` int,
	`resolution` text,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	CONSTRAINT `escalation_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `request_stage_tracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`stageCode` varchar(50) NOT NULL,
	`startedAt` datetime NOT NULL DEFAULT (now()),
	`dueAt` datetime NOT NULL,
	`completedAt` datetime,
	`isDelayed` boolean DEFAULT false,
	`delayDays` int DEFAULT 0,
	`escalationLevel` int DEFAULT 0,
	`assignedTo` int,
	`notes` text,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	`updatedAt` datetime NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `request_stage_tracking_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stage_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stageCode` varchar(50) NOT NULL,
	`stageName` varchar(100) NOT NULL,
	`stageOrder` int NOT NULL DEFAULT 0,
	`durationDays` int NOT NULL DEFAULT 3,
	`warningDays` int DEFAULT 1,
	`escalationLevel1Days` int DEFAULT 1,
	`escalationLevel2Days` int DEFAULT 3,
	`isActive` boolean DEFAULT true,
	`description` text,
	`requiredConditions` text,
	`availableActions` text,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	`updatedAt` datetime NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stage_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `stage_settings_stageCode_unique` UNIQUE(`stageCode`)
);
--> statement-breakpoint
ALTER TABLE `escalation_logs` ADD CONSTRAINT `escalation_logs_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `escalation_logs` ADD CONSTRAINT `escalation_logs_escalatedTo_users_id_fk` FOREIGN KEY (`escalatedTo`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `escalation_logs` ADD CONSTRAINT `escalation_logs_escalatedFrom_users_id_fk` FOREIGN KEY (`escalatedFrom`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `escalation_logs` ADD CONSTRAINT `escalation_logs_resolvedBy_users_id_fk` FOREIGN KEY (`resolvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `request_stage_tracking` ADD CONSTRAINT `request_stage_tracking_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `request_stage_tracking` ADD CONSTRAINT `request_stage_tracking_assignedTo_users_id_fk` FOREIGN KEY (`assignedTo`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;