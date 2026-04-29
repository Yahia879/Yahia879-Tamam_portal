-- تحديث جدول الموردين بالحقول الجديدة
ALTER TABLE `suppliers` ADD COLUMN `entityType` enum('company','establishment') DEFAULT 'establishment';
--> statement-breakpoint
ALTER TABLE `suppliers` ADD COLUMN `commercialActivity` varchar(500);
--> statement-breakpoint
ALTER TABLE `suppliers` ADD COLUMN `yearsOfExperience` int;
--> statement-breakpoint
ALTER TABLE `suppliers` ADD COLUMN `workFields` json;
--> statement-breakpoint
ALTER TABLE `suppliers` ADD COLUMN `city` varchar(100);
--> statement-breakpoint
ALTER TABLE `suppliers` ADD COLUMN `googleMapsUrl` varchar(500);
--> statement-breakpoint
ALTER TABLE `suppliers` ADD COLUMN `googleMapsLat` decimal(10,7);
--> statement-breakpoint
ALTER TABLE `suppliers` ADD COLUMN `googleMapsLng` decimal(10,7);
--> statement-breakpoint
ALTER TABLE `suppliers` ADD COLUMN `phoneSecondary` varchar(20);
--> statement-breakpoint
ALTER TABLE `suppliers` ADD COLUMN `contactPersonTitle` varchar(100);
--> statement-breakpoint
ALTER TABLE `suppliers` ADD COLUMN `bankAccountName` varchar(255);
--> statement-breakpoint
ALTER TABLE `suppliers` ADD COLUMN `bankName` varchar(255);
--> statement-breakpoint
ALTER TABLE `suppliers` ADD COLUMN `iban` varchar(50);
--> statement-breakpoint
ALTER TABLE `suppliers` ADD COLUMN `commercialRegisterDoc` varchar(500);
--> statement-breakpoint
ALTER TABLE `suppliers` ADD COLUMN `vatCertificateDoc` varchar(500);
--> statement-breakpoint
ALTER TABLE `suppliers` ADD COLUMN `nationalAddressDoc` varchar(500);
--> statement-breakpoint
ALTER TABLE `suppliers` ADD COLUMN `approvalStatus` enum('pending','approved','rejected','suspended') DEFAULT 'pending';
--> statement-breakpoint
ALTER TABLE `suppliers` ADD COLUMN `approvedBy` int;
--> statement-breakpoint
ALTER TABLE `suppliers` ADD COLUMN `approvedAt` datetime;
--> statement-breakpoint
ALTER TABLE `suppliers` ADD COLUMN `rejectionReason` text;
--> statement-breakpoint
ALTER TABLE `suppliers` ADD COLUMN `createdBy` int;
--> statement-breakpoint
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
-- تحديث الحقول المطلوبة
ALTER TABLE `suppliers` MODIFY COLUMN `commercialRegister` varchar(50) NOT NULL;
--> statement-breakpoint
ALTER TABLE `suppliers` MODIFY COLUMN `email` varchar(320) NOT NULL;
--> statement-breakpoint
ALTER TABLE `suppliers` MODIFY COLUMN `phone` varchar(20) NOT NULL;
--> statement-breakpoint
ALTER TABLE `suppliers` MODIFY COLUMN `contactPerson` varchar(255) NOT NULL;
