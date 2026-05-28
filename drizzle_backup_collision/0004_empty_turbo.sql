ALTER TABLE `suppliers` MODIFY COLUMN `contactPerson` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `suppliers` MODIFY COLUMN `phone` varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE `suppliers` MODIFY COLUMN `email` varchar(320) NOT NULL;--> statement-breakpoint
ALTER TABLE `suppliers` MODIFY COLUMN `commercialRegister` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `organization_settings` ADD `signatoryPhone` varchar(20);--> statement-breakpoint
ALTER TABLE `organization_settings` ADD `signatoryEmail` varchar(320);--> statement-breakpoint
ALTER TABLE `organization_settings` ADD `bankName` varchar(100);--> statement-breakpoint
ALTER TABLE `organization_settings` ADD `bankAccountName` varchar(255);--> statement-breakpoint
ALTER TABLE `organization_settings` ADD `iban` varchar(34);--> statement-breakpoint
ALTER TABLE `organization_settings` ADD `contractPrefix` varchar(10) DEFAULT 'CON';--> statement-breakpoint
ALTER TABLE `organization_settings` ADD `contractFooterText` text;--> statement-breakpoint
ALTER TABLE `organization_settings` ADD `contractTermsAndConditions` text;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `entityType` enum('company','establishment') DEFAULT 'establishment';--> statement-breakpoint
ALTER TABLE `suppliers` ADD `commercialActivity` varchar(500);--> statement-breakpoint
ALTER TABLE `suppliers` ADD `yearsOfExperience` int;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `workFields` json;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `city` varchar(100);--> statement-breakpoint
ALTER TABLE `suppliers` ADD `googleMapsUrl` varchar(500);--> statement-breakpoint
ALTER TABLE `suppliers` ADD `googleMapsLat` decimal(10,7);--> statement-breakpoint
ALTER TABLE `suppliers` ADD `googleMapsLng` decimal(10,7);--> statement-breakpoint
ALTER TABLE `suppliers` ADD `phoneSecondary` varchar(20);--> statement-breakpoint
ALTER TABLE `suppliers` ADD `contactPersonTitle` varchar(100);--> statement-breakpoint
ALTER TABLE `suppliers` ADD `bankAccountName` varchar(255);--> statement-breakpoint
ALTER TABLE `suppliers` ADD `bankName` varchar(255);--> statement-breakpoint
ALTER TABLE `suppliers` ADD `iban` varchar(50);--> statement-breakpoint
ALTER TABLE `suppliers` ADD `commercialRegisterDoc` varchar(500);--> statement-breakpoint
ALTER TABLE `suppliers` ADD `vatCertificateDoc` varchar(500);--> statement-breakpoint
ALTER TABLE `suppliers` ADD `nationalAddressDoc` varchar(500);--> statement-breakpoint
ALTER TABLE `suppliers` ADD `approvalStatus` enum('pending','approved','rejected','suspended') DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `suppliers` ADD `approvedBy` int;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `approvedAt` datetime;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `rejectionReason` text;--> statement-breakpoint
ALTER TABLE `suppliers` ADD `createdBy` int;--> statement-breakpoint
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;