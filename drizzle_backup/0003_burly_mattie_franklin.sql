CREATE TABLE `contract_number_sequence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL,
	`lastSequence` int NOT NULL DEFAULT 0,
	`updatedAt` datetime NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contract_number_sequence_id` PRIMARY KEY(`id`),
	CONSTRAINT `contract_number_sequence_year_unique` UNIQUE(`year`)
);
--> statement-breakpoint
CREATE TABLE `contract_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contractId` int NOT NULL,
	`phaseName` varchar(255) NOT NULL,
	`phaseOrder` int NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`dueDate` datetime,
	`status` enum('pending','due','paid') DEFAULT 'pending',
	`paidAt` datetime,
	`paidBy` int,
	`notes` text,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	`updatedAt` datetime NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contract_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contracts_enhanced` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contractNumber` varchar(50) NOT NULL,
	`contractYear` int NOT NULL,
	`contractSequence` int NOT NULL,
	`contractType` enum('supervision','construction','supply','maintenance','consulting') NOT NULL,
	`contractTitle` varchar(500) NOT NULL,
	`projectId` int,
	`requestId` int,
	`supplierId` int,
	`secondPartyName` varchar(255) NOT NULL,
	`secondPartyCommercialRegister` varchar(50),
	`secondPartyRepresentative` varchar(255),
	`secondPartyTitle` varchar(100),
	`secondPartyAddress` text,
	`secondPartyPhone` varchar(20),
	`secondPartyEmail` varchar(320),
	`secondPartyBankName` varchar(255),
	`secondPartyIban` varchar(50),
	`secondPartyAccountName` varchar(255),
	`mosqueName` varchar(255),
	`mosqueNeighborhood` varchar(255),
	`mosqueCity` varchar(100),
	`contractAmount` decimal(15,2) NOT NULL,
	`contractAmountText` varchar(500),
	`duration` int NOT NULL,
	`durationUnit` enum('days','weeks','months') DEFAULT 'months',
	`contractDate` datetime,
	`contractDateHijri` varchar(50),
	`startDate` datetime,
	`endDate` datetime,
	`status` enum('draft','pending_approval','approved','active','completed','terminated','cancelled') DEFAULT 'draft',
	`customTerms` text,
	`customNotifications` text,
	`customGeneralTerms` text,
	`documentUrl` varchar(500),
	`signedDocumentUrl` varchar(500),
	`approvedBy` int,
	`approvedAt` datetime,
	`createdBy` int,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	`updatedAt` datetime NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contracts_enhanced_id` PRIMARY KEY(`id`),
	CONSTRAINT `contracts_enhanced_contractNumber_unique` UNIQUE(`contractNumber`)
);
--> statement-breakpoint
CREATE TABLE `organization_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationName` varchar(255) NOT NULL,
	`organizationNameShort` varchar(100),
	`licenseNumber` varchar(50),
	`authorizedSignatory` varchar(255),
	`signatoryTitle` varchar(100),
	`address` text,
	`city` varchar(100),
	`phone` varchar(20),
	`email` varchar(320),
	`website` varchar(255),
	`logoUrl` varchar(500),
	`stampUrl` varchar(500),
	`updatedBy` int,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	`updatedAt` datetime NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organization_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `contract_payments` ADD CONSTRAINT `contract_payments_contractId_contracts_enhanced_id_fk` FOREIGN KEY (`contractId`) REFERENCES `contracts_enhanced`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contract_payments` ADD CONSTRAINT `contract_payments_paidBy_users_id_fk` FOREIGN KEY (`paidBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contracts_enhanced` ADD CONSTRAINT `contracts_enhanced_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contracts_enhanced` ADD CONSTRAINT `contracts_enhanced_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contracts_enhanced` ADD CONSTRAINT `contracts_enhanced_supplierId_suppliers_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contracts_enhanced` ADD CONSTRAINT `contracts_enhanced_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contracts_enhanced` ADD CONSTRAINT `contracts_enhanced_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organization_settings` ADD CONSTRAINT `organization_settings_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;