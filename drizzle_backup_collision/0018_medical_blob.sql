CREATE TABLE `disbursement_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(50) NOT NULL,
	`disbursementRequestId` int NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`beneficiaryName` varchar(255) NOT NULL,
	`beneficiaryBank` varchar(255),
	`beneficiaryIban` varchar(50),
	`paymentMethod` enum('bank_transfer','check','cash') DEFAULT 'bank_transfer',
	`status` enum('draft','pending','approved','rejected','executed') DEFAULT 'draft',
	`createdBy` int NOT NULL,
	`approvedBy` int,
	`approvedAt` datetime,
	`approvalNotes` text,
	`executedBy` int,
	`executedAt` datetime,
	`transactionReference` varchar(255),
	`rejectedBy` int,
	`rejectedAt` datetime,
	`rejectionReason` text,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	`updatedAt` datetime NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `disbursement_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `disbursement_orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `disbursement_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestNumber` varchar(50) NOT NULL,
	`projectId` int NOT NULL,
	`contractId` int,
	`contractPaymentId` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`amount` decimal(15,2) NOT NULL,
	`paymentType` enum('advance','progress','final','retention') DEFAULT 'progress',
	`completionPercentage` int,
	`attachmentsJson` text,
	`status` enum('draft','pending','approved','rejected','paid') DEFAULT 'draft',
	`requestedBy` int NOT NULL,
	`requestedAt` datetime NOT NULL DEFAULT (now()),
	`approvedBy` int,
	`approvedAt` datetime,
	`approvalNotes` text,
	`rejectedBy` int,
	`rejectedAt` datetime,
	`rejectionReason` text,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	`updatedAt` datetime NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `disbursement_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `disbursement_requests_requestNumber_unique` UNIQUE(`requestNumber`)
);
--> statement-breakpoint
ALTER TABLE `disbursement_orders` ADD CONSTRAINT `do_disb_req_id_fk` FOREIGN KEY (`disbursementRequestId`) REFERENCES `disbursement_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `disbursement_orders` ADD CONSTRAINT `disbursement_orders_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `disbursement_orders` ADD CONSTRAINT `disbursement_orders_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `disbursement_orders` ADD CONSTRAINT `disbursement_orders_executedBy_users_id_fk` FOREIGN KEY (`executedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `disbursement_orders` ADD CONSTRAINT `disbursement_orders_rejectedBy_users_id_fk` FOREIGN KEY (`rejectedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `disbursement_requests` ADD CONSTRAINT `disbursement_requests_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `disbursement_requests` ADD CONSTRAINT `disbursement_requests_contractId_contracts_enhanced_id_fk` FOREIGN KEY (`contractId`) REFERENCES `contracts_enhanced`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `disbursement_requests` ADD CONSTRAINT `disbursement_requests_contractPaymentId_contract_payments_id_fk` FOREIGN KEY (`contractPaymentId`) REFERENCES `contract_payments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `disbursement_requests` ADD CONSTRAINT `disbursement_requests_requestedBy_users_id_fk` FOREIGN KEY (`requestedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `disbursement_requests` ADD CONSTRAINT `disbursement_requests_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `disbursement_requests` ADD CONSTRAINT `disbursement_requests_rejectedBy_users_id_fk` FOREIGN KEY (`rejectedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;