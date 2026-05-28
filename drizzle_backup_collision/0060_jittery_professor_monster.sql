CREATE TABLE `programs` (
	`id` varchar(50) NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`color` varchar(50),
	`icon` varchar(50),
	`requiresMosque` boolean DEFAULT true,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `programs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `mosque_requests` MODIFY COLUMN `programType` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `deletedAt` datetime;--> statement-breakpoint
ALTER TABLE `contract_templates` ADD `isSystem` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `disbursement_requests` ADD `dateMiladi` date;--> statement-breakpoint
ALTER TABLE `signatories` ADD `address` text;