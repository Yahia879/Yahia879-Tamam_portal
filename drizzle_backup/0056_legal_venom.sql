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
ALTER TABLE `contract_modification_logs` DROP FOREIGN KEY `cml_cont_enh_id_fk`;
--> statement-breakpoint
ALTER TABLE `contract_modification_logs` DROP FOREIGN KEY `cml_mod_req_id_fk`;
--> statement-breakpoint
ALTER TABLE `contract_modification_logs` DROP FOREIGN KEY `contract_modification_logs_modifiedBy_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `contract_modification_requests` DROP FOREIGN KEY `cmr_cont_enh_id_fk`;
--> statement-breakpoint
ALTER TABLE `contract_modification_requests` DROP FOREIGN KEY `contract_modification_requests_requestedBy_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `contract_modification_requests` DROP FOREIGN KEY `contract_modification_requests_reviewedBy_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `disbursement_orders` DROP FOREIGN KEY `do_disb_req_id_fk`;
--> statement-breakpoint
ALTER TABLE `permissions_audit_log` DROP FOREIGN KEY `permissions_audit_log_target_user_id_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `permissions_audit_log` DROP FOREIGN KEY `permissions_audit_log_target_role_id_roles_id_fk`;
--> statement-breakpoint
ALTER TABLE `permissions_audit_log` DROP FOREIGN KEY `permissions_audit_log_permission_id_permissions_id_fk`;
--> statement-breakpoint
ALTER TABLE `contract_modification_requests` MODIFY COLUMN `reviewedAt` datetime;--> statement-breakpoint
ALTER TABLE `contract_payments` MODIFY COLUMN `dueDate` datetime;--> statement-breakpoint
ALTER TABLE `contract_payments` MODIFY COLUMN `paidAt` datetime;--> statement-breakpoint
ALTER TABLE `contracts` MODIFY COLUMN `startDate` datetime;--> statement-breakpoint
ALTER TABLE `contracts` MODIFY COLUMN `endDate` datetime;--> statement-breakpoint
ALTER TABLE `contracts_enhanced` MODIFY COLUMN `contractDate` datetime;--> statement-breakpoint
ALTER TABLE `contracts_enhanced` MODIFY COLUMN `startDate` datetime;--> statement-breakpoint
ALTER TABLE `contracts_enhanced` MODIFY COLUMN `endDate` datetime;--> statement-breakpoint
ALTER TABLE `contracts_enhanced` MODIFY COLUMN `approvedAt` datetime;--> statement-breakpoint
ALTER TABLE `disbursement_orders` MODIFY COLUMN `approvedAt` datetime;--> statement-breakpoint
ALTER TABLE `disbursement_orders` MODIFY COLUMN `executedAt` datetime;--> statement-breakpoint
ALTER TABLE `disbursement_orders` MODIFY COLUMN `rejectedAt` datetime;--> statement-breakpoint
ALTER TABLE `disbursement_requests` MODIFY COLUMN `approvedAt` datetime;--> statement-breakpoint
ALTER TABLE `disbursement_requests` MODIFY COLUMN `rejectedAt` datetime;--> statement-breakpoint
ALTER TABLE `donation_opportunities` MODIFY COLUMN `startDate` datetime;--> statement-breakpoint
ALTER TABLE `donation_opportunities` MODIFY COLUMN `endDate` datetime;--> statement-breakpoint
ALTER TABLE `employees` MODIFY COLUMN `hireDate` datetime;--> statement-breakpoint
ALTER TABLE `escalation_logs` MODIFY COLUMN `resolvedAt` datetime;--> statement-breakpoint
ALTER TABLE `field_visit_reports` MODIFY COLUMN `visitDate` datetime NOT NULL;--> statement-breakpoint
ALTER TABLE `field_visits` MODIFY COLUMN `scheduledDate` datetime;--> statement-breakpoint
ALTER TABLE `field_visits` MODIFY COLUMN `scheduledAt` datetime;--> statement-breakpoint
ALTER TABLE `field_visits` MODIFY COLUMN `executionDate` datetime;--> statement-breakpoint
ALTER TABLE `field_visits` MODIFY COLUMN `executedAt` datetime;--> statement-breakpoint
ALTER TABLE `field_visits` MODIFY COLUMN `reportSubmittedAt` datetime;--> statement-breakpoint
ALTER TABLE `final_reports` MODIFY COLUMN `completionDate` datetime;--> statement-breakpoint
ALTER TABLE `handovers` MODIFY COLUMN `approvedAt` datetime;--> statement-breakpoint
ALTER TABLE `mosque_requests` MODIFY COLUMN `fieldVisitScheduledDate` datetime;--> statement-breakpoint
ALTER TABLE `mosque_requests` MODIFY COLUMN `reviewedAt` datetime;--> statement-breakpoint
ALTER TABLE `mosque_requests` MODIFY COLUMN `approvedAt` datetime;--> statement-breakpoint
ALTER TABLE `mosque_requests` MODIFY COLUMN `completedAt` datetime;--> statement-breakpoint
ALTER TABLE `mosques` MODIFY COLUMN `approvalDate` datetime;--> statement-breakpoint
ALTER TABLE `notifications` MODIFY COLUMN `readAt` datetime;--> statement-breakpoint
ALTER TABLE `password_reset_tokens` MODIFY COLUMN `expiresAt` datetime NOT NULL;--> statement-breakpoint
ALTER TABLE `payments` MODIFY COLUMN `paidAt` datetime;--> statement-breakpoint
ALTER TABLE `progress_reports` MODIFY COLUMN `reviewedAt` datetime;--> statement-breakpoint
ALTER TABLE `project_phases` MODIFY COLUMN `startDate` datetime;--> statement-breakpoint
ALTER TABLE `project_phases` MODIFY COLUMN `endDate` datetime;--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `startDate` datetime;--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `expectedEndDate` datetime;--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `actualEndDate` datetime;--> statement-breakpoint
ALTER TABLE `quick_response_reports` MODIFY COLUMN `responseDate` datetime NOT NULL;--> statement-breakpoint
ALTER TABLE `quotations` MODIFY COLUMN `negotiatedAt` datetime;--> statement-breakpoint
ALTER TABLE `quotations` MODIFY COLUMN `validUntil` datetime;--> statement-breakpoint
ALTER TABLE `request_stage_tracking` MODIFY COLUMN `dueAt` datetime;--> statement-breakpoint
ALTER TABLE `request_stage_tracking` MODIFY COLUMN `completedAt` datetime;--> statement-breakpoint
ALTER TABLE `request_sub_stage_tracking` MODIFY COLUMN `dueAt` datetime NOT NULL;--> statement-breakpoint
ALTER TABLE `request_sub_stage_tracking` MODIFY COLUMN `completedAt` datetime;--> statement-breakpoint
ALTER TABLE `satisfaction_surveys` MODIFY COLUMN `publishedAt` datetime;--> statement-breakpoint
ALTER TABLE `satisfaction_surveys` MODIFY COLUMN `closedAt` datetime;--> statement-breakpoint
ALTER TABLE `suppliers` MODIFY COLUMN `approvedAt` datetime;--> statement-breakpoint
ALTER TABLE `user_permissions` MODIFY COLUMN `expires_at` datetime;--> statement-breakpoint
ALTER TABLE `user_roles` MODIFY COLUMN `expires_at` datetime;--> statement-breakpoint
ALTER TABLE `boq_items` ADD CONSTRAINT `boq_items_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `boq_items` ADD CONSTRAINT `boq_items_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contract_modification_logs` ADD CONSTRAINT `cml_contract_fk` FOREIGN KEY (`contractId`) REFERENCES `contracts_enhanced`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contract_modification_logs` ADD CONSTRAINT `cml_modreq_fk` FOREIGN KEY (`modificationRequestId`) REFERENCES `contract_modification_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contract_modification_logs` ADD CONSTRAINT `cml_user_fk` FOREIGN KEY (`modifiedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contract_modification_requests` ADD CONSTRAINT `cmr_contract_fk` FOREIGN KEY (`contractId`) REFERENCES `contracts_enhanced`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contract_modification_requests` ADD CONSTRAINT `cmr_requested_fk` FOREIGN KEY (`requestedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contract_modification_requests` ADD CONSTRAINT `cmr_reviewed_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `disbursement_orders` ADD CONSTRAINT `do_req_fk` FOREIGN KEY (`disbursementRequestId`) REFERENCES `disbursement_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `permissions_audit_log` ADD CONSTRAINT `permissions_audit_log_target_user_id_users_id_fk` FOREIGN KEY (`target_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `permissions_audit_log` ADD CONSTRAINT `permissions_audit_log_target_role_id_roles_id_fk` FOREIGN KEY (`target_role_id`) REFERENCES `roles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `permissions_audit_log` ADD CONSTRAINT `permissions_audit_log_permission_id_permissions_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE set null ON UPDATE no action;