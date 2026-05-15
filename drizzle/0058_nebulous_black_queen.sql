CREATE TABLE `request_evaluations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`userId` int,
	`decision` varchar(50),
	`justification` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `request_evaluations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `request_evaluations` ADD CONSTRAINT `request_evaluations_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `request_evaluations` ADD CONSTRAINT `request_evaluations_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;