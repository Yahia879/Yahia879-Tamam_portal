CREATE TABLE `project_financial_details` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`approvedQuotationId` int,
	`supportEntity` varchar(255),
	`customSupportEntity` varchar(255),
	`supportAmount` decimal(15,2) DEFAULT '0.00',
	`adminFeeType` enum('percentage','fixed') DEFAULT 'percentage',
	`adminFeeValue` decimal(15,2) DEFAULT '0.00',
	`adminFeeAmount` decimal(15,2) DEFAULT '0.00',
	`associationFundingAmount` decimal(15,2) DEFAULT '0.00',
	`associationFundingNotes` text,
	`supportSourcesJson` text,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_financial_details_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_financial_details_projectId_unique` UNIQUE(`projectId`)
);
--> statement-breakpoint
CREATE TABLE `receipt_vouchers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`voucherNumber` varchar(50) NOT NULL,
	`projectId` int NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`receiptDate` datetime NOT NULL,
	`payerName` varchar(255),
	`paymentMethod` varchar(50) DEFAULT 'bank_transfer',
	`referenceNumber` varchar(100),
	`bankName` varchar(255),
	`attachmentUrl` varchar(500),
	`notes` text,
	`status` varchar(50) DEFAULT 'pending_approval',
	`rejectionReason` text,
	`createdById` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `receipt_vouchers_id` PRIMARY KEY(`id`),
	CONSTRAINT `receipt_vouchers_voucherNumber_unique` UNIQUE(`voucherNumber`)
);
--> statement-breakpoint
ALTER TABLE `quantity_schedules` MODIFY COLUMN `itemName` text NOT NULL;--> statement-breakpoint
ALTER TABLE `contracts_enhanced` ADD `financialApprovedAt` datetime;--> statement-breakpoint
ALTER TABLE `disbursement_orders` ADD `financialApprovedAt` datetime;--> statement-breakpoint
ALTER TABLE `disbursement_orders` ADD `isException` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `disbursement_orders` ADD `exceptionApprovedBy` int;--> statement-breakpoint
ALTER TABLE `disbursement_orders` ADD `creatorSignatureName` text;--> statement-breakpoint
ALTER TABLE `disbursement_orders` ADD `creatorSignatureDepartment` text;--> statement-breakpoint
ALTER TABLE `disbursement_orders` ADD `creatorSignatureUrl` text;--> statement-breakpoint
ALTER TABLE `disbursement_orders` ADD `showCreatorSignature` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `disbursement_orders` ADD `showExecutiveDirectorSignature` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `disbursement_requests` ADD `fundingSourceName` varchar(255);--> statement-breakpoint
ALTER TABLE `disbursement_requests` ADD `financialApprovedAt` datetime;--> statement-breakpoint
ALTER TABLE `disbursement_requests` ADD `creatorSignatureUrl` text;--> statement-breakpoint
ALTER TABLE `disbursement_requests` ADD `isException` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `disbursement_requests` ADD `exceptionApprovedBy` int;--> statement-breakpoint
ALTER TABLE `mosque_requests` ADD `descriptiveName` varchar(255);--> statement-breakpoint
ALTER TABLE `project_financial_details` ADD CONSTRAINT `project_financial_details_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_financial_details` ADD CONSTRAINT `project_financial_details_approvedQuotationId_quotations_id_fk` FOREIGN KEY (`approvedQuotationId`) REFERENCES `quotations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `receipt_vouchers` ADD CONSTRAINT `receipt_vouchers_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `receipt_vouchers` ADD CONSTRAINT `receipt_vouchers_createdById_users_id_fk` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `disbursement_orders` ADD CONSTRAINT `disbursement_orders_exceptionApprovedBy_users_id_fk` FOREIGN KEY (`exceptionApprovedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `disbursement_requests` ADD CONSTRAINT `disbursement_requests_exceptionApprovedBy_users_id_fk` FOREIGN KEY (`exceptionApprovedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;