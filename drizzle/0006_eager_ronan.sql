CREATE TABLE `request_exceptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`reason` text NOT NULL,
	`attachment` varchar(500),
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `request_exceptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `support_tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`ticketType` enum('technical_issue','suggestion') NOT NULL,
	`description` text NOT NULL,
	`attachments` json,
	`status` enum('pending','resolved','needs_clarification') NOT NULL DEFAULT 'pending',
	`replies` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `support_tickets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `disbursement_requests` ADD `adminFees` decimal(15,2);--> statement-breakpoint
ALTER TABLE `disbursement_requests` ADD `creatorSignatureName` text;--> statement-breakpoint
ALTER TABLE `disbursement_requests` ADD `creatorSignatureDepartment` text;--> statement-breakpoint
ALTER TABLE `final_reports` ADD `contractAmount` decimal(15,2);--> statement-breakpoint
ALTER TABLE `final_reports` ADD `linkName` varchar(255);--> statement-breakpoint
ALTER TABLE `final_reports` ADD `linkUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `organization_settings` ADD `technicalSupervisorLogoUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `organization_settings` ADD `administrativeSupervisorLogoUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `programs` ADD `sortOrder` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` ADD `signatureName` text;--> statement-breakpoint
ALTER TABLE `users` ADD `signatureDepartment` text;--> statement-breakpoint
ALTER TABLE `users` ADD `adminNotes` text;--> statement-breakpoint
ALTER TABLE `users` ADD `remarksDocument` text;--> statement-breakpoint
ALTER TABLE `users` ADD `notesRequiredType` text;--> statement-breakpoint
ALTER TABLE `users` ADD `rejectionResponse` text;--> statement-breakpoint
ALTER TABLE `request_exceptions` ADD CONSTRAINT `request_exceptions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `support_tickets` ADD CONSTRAINT `support_tickets_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;