CREATE TABLE `notification_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`triggerId` varchar(100) NOT NULL,
	`templateMessage` text NOT NULL,
	CONSTRAINT `notification_templates_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_templates_triggerId_unique` UNIQUE(`triggerId`)
);
--> statement-breakpoint
ALTER TABLE `disbursement_requests` ADD `isDirect` boolean DEFAULT false NOT NULL;