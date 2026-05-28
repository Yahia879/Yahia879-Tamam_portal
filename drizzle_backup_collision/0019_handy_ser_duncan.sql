CREATE TABLE `progress_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportNumber` varchar(50) NOT NULL,
	`projectId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`reportDate` date NOT NULL,
	`reportPeriodStart` date,
	`reportPeriodEnd` date,
	`overallProgress` int DEFAULT 0,
	`plannedProgress` int DEFAULT 0,
	`actualProgress` int DEFAULT 0,
	`variance` int DEFAULT 0,
	`workSummary` text,
	`challenges` text,
	`nextSteps` text,
	`recommendations` text,
	`budgetSpent` decimal(15,2) DEFAULT '0',
	`budgetRemaining` decimal(15,2) DEFAULT '0',
	`attachments` json,
	`photos` json,
	`status` enum('draft','submitted','reviewed','approved') DEFAULT 'draft',
	`createdBy` int NOT NULL,
	`reviewedBy` int,
	`reviewedAt` datetime,
	`reviewNotes` text,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	`updatedAt` datetime NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `progress_reports_id` PRIMARY KEY(`id`),
	CONSTRAINT `progress_reports_reportNumber_unique` UNIQUE(`reportNumber`)
);
--> statement-breakpoint
ALTER TABLE `progress_reports` ADD CONSTRAINT `progress_reports_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `progress_reports` ADD CONSTRAINT `progress_reports_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `progress_reports` ADD CONSTRAINT `progress_reports_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;