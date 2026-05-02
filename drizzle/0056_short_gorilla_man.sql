CREATE TABLE `boq_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int,
	`projectId` int,
	`itemName` varchar(255) NOT NULL,
	`itemDescription` text,
	`unit` varchar(50) NOT NULL,
	`quantity` decimal(15,3) NOT NULL,
	`unitPrice` decimal(15,2),
	`totalPrice` decimal(15,2),
	`category` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `boq_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `boq_items` ADD CONSTRAINT `boq_items_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `boq_items` ADD CONSTRAINT `boq_items_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;