ALTER TABLE `disbursement_orders` MODIFY COLUMN `status` enum('draft','pending','pending_executive','approved','rejected','executed','edited') DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `disbursement_requests` MODIFY COLUMN `status` enum('draft','pending','pending_executive','approved','rejected','paid') DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('super_admin','system_admin','general_manager','executive_director','projects_office','field_team','quick_response','financial','project_manager','corporate_comm','service_requester') NOT NULL DEFAULT 'service_requester';--> statement-breakpoint
ALTER TABLE `contracts_enhanced` ADD `currentStep` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `disbursement_requests` ADD `showCreatorSignature` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `disbursement_requests` ADD `showExecutiveDirectorSignature` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `progress_reports` ADD `milestones` longtext;--> statement-breakpoint
ALTER TABLE `projects` ADD `plannedProgress` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `projects` ADD `milestones` longtext;--> statement-breakpoint
ALTER TABLE `signatories` ADD `userId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `signatureUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `showSignatureInDocuments` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `signatories` ADD CONSTRAINT `signatories_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;