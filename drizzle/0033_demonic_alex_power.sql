CREATE TABLE `handovers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`requestId` int NOT NULL,
	`type` enum('preliminary','warranty','final') NOT NULL,
	`handoverDate` date,
	`completionPercentage` decimal(5,2) DEFAULT '0',
	`notes` text,
	`documentUrl` text,
	`photosUrls` json,
	`status` enum('pending','approved','rejected','completed') NOT NULL DEFAULT 'pending',
	`approvedBy` int,
	`approvedAt` datetime,
	`approvalNotes` text,
	`warrantyStartDate` date,
	`warrantyEndDate` date,
	`warrantyDurationMonths` int,
	`createdBy` int NOT NULL,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	`updatedAt` datetime NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `handovers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `satisfaction_surveys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`requestId` int NOT NULL,
	`type` enum('stakeholder','beneficiary') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`questions` json NOT NULL,
	`status` enum('draft','published','closed') NOT NULL DEFAULT 'draft',
	`publishedAt` datetime,
	`closedAt` datetime,
	`surveyUrl` varchar(500),
	`createdBy` int NOT NULL,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	`updatedAt` datetime NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `satisfaction_surveys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `survey_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`surveyId` int NOT NULL,
	`respondentName` varchar(255),
	`respondentEmail` varchar(255),
	`respondentPhone` varchar(20),
	`responses` json NOT NULL,
	`overallRating` decimal(3,2),
	`submittedAt` datetime NOT NULL DEFAULT (now()),
	CONSTRAINT `survey_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `handovers` ADD CONSTRAINT `handovers_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `handovers` ADD CONSTRAINT `handovers_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `handovers` ADD CONSTRAINT `handovers_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `handovers` ADD CONSTRAINT `handovers_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `satisfaction_surveys` ADD CONSTRAINT `satisfaction_surveys_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `satisfaction_surveys` ADD CONSTRAINT `satisfaction_surveys_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `satisfaction_surveys` ADD CONSTRAINT `satisfaction_surveys_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `survey_responses` ADD CONSTRAINT `survey_responses_surveyId_satisfaction_surveys_id_fk` FOREIGN KEY (`surveyId`) REFERENCES `satisfaction_surveys`(`id`) ON DELETE no action ON UPDATE no action;