ALTER TABLE `quotations` ADD `includesTax` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `quotations` ADD `taxRate` decimal(5,2) DEFAULT '15.00';--> statement-breakpoint
ALTER TABLE `quotations` ADD `taxAmount` decimal(15,2);--> statement-breakpoint
ALTER TABLE `quotations` ADD `discountType` enum('percentage','fixed');--> statement-breakpoint
ALTER TABLE `quotations` ADD `discountValue` decimal(15,2);--> statement-breakpoint
ALTER TABLE `quotations` ADD `discountAmount` decimal(15,2);--> statement-breakpoint
ALTER TABLE `quotations` ADD `finalAmount` decimal(15,2);