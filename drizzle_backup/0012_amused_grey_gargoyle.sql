CREATE TABLE `contract_modification_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contractId` int NOT NULL,
	`modificationRequestId` int,
	`fieldName` varchar(100) NOT NULL,
	`oldValue` text,
	`newValue` text,
	`modifiedBy` int NOT NULL,
	`modifiedAt` datetime NOT NULL DEFAULT (now()),
	CONSTRAINT `contract_modification_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contract_modification_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contractId` int NOT NULL,
	`modificationType` varchar(50) NOT NULL,
	`currentValue` text,
	`newValue` text,
	`justification` text NOT NULL,
	`status` enum('pending','approved','rejected') DEFAULT 'pending',
	`requestedBy` int NOT NULL,
	`requestedAt` datetime NOT NULL DEFAULT (now()),
	`reviewedBy` int,
	`reviewedAt` datetime,
	`reviewNotes` text,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	`updatedAt` datetime NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contract_modification_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `contract_modification_logs` ADD CONSTRAINT `cml_cont_enh_id_fk` FOREIGN KEY (`contractId`) REFERENCES `contracts_enhanced`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contract_modification_logs` ADD CONSTRAINT `cml_mod_req_id_fk` FOREIGN KEY (`modificationRequestId`) REFERENCES `contract_modification_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contract_modification_logs` ADD CONSTRAINT `contract_modification_logs_modifiedBy_users_id_fk` FOREIGN KEY (`modifiedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contract_modification_requests` ADD CONSTRAINT `cmr_cont_enh_id_fk` FOREIGN KEY (`contractId`) REFERENCES `contracts_enhanced`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contract_modification_requests` ADD CONSTRAINT `contract_modification_requests_requestedBy_users_id_fk` FOREIGN KEY (`requestedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contract_modification_requests` ADD CONSTRAINT `contract_modification_requests_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;