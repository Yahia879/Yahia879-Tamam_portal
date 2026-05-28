ALTER TABLE `users` MODIFY COLUMN `deletedAt` timestamp DEFAULT null;--> statement-breakpoint
ALTER TABLE `disbursement_requests` ADD `dateMiladi` date;