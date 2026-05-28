ALTER TABLE `payments` DROP FOREIGN KEY `payments_contractId_contracts_id_fk`;
--> statement-breakpoint
ALTER TABLE `progress_reports` MODIFY COLUMN `attachments` longtext;--> statement-breakpoint
ALTER TABLE `progress_reports` MODIFY COLUMN `photos` longtext;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_contractId_contracts_enhanced_id_fk` FOREIGN KEY (`contractId`) REFERENCES `contracts_enhanced`(`id`) ON DELETE no action ON UPDATE no action;