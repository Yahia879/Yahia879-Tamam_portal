ALTER TABLE `quotations` MODIFY COLUMN `status` enum('pending','negotiating','accepted','rejected','expired') DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `quotations` ADD `negotiatedAmount` decimal(15,2);--> statement-breakpoint
ALTER TABLE `quotations` ADD `negotiationNotes` text;--> statement-breakpoint
ALTER TABLE `quotations` ADD `negotiatedBy` int;--> statement-breakpoint
ALTER TABLE `quotations` ADD `negotiatedAt` datetime;--> statement-breakpoint
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_negotiatedBy_users_id_fk` FOREIGN KEY (`negotiatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;