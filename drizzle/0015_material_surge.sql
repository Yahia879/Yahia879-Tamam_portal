CREATE TABLE `signatories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`title` varchar(100) NOT NULL,
	`nationalId` varchar(20),
	`phone` varchar(20),
	`email` varchar(320),
	`signatureUrl` varchar(500),
	`isDefault` boolean DEFAULT false,
	`isActive` boolean DEFAULT true,
	`sortOrder` int DEFAULT 0,
	`createdBy` int,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	`updatedAt` datetime NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `signatories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `signatories` ADD CONSTRAINT `signatories_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;