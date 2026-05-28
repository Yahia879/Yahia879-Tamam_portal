ALTER TABLE `users` MODIFY COLUMN `deletedAt` datetime;--> statement-breakpoint
ALTER TABLE `contract_templates` ADD `isSystem` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `signatories` ADD `address` text;