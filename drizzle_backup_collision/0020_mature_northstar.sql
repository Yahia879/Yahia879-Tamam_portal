ALTER TABLE `disbursement_orders` MODIFY COLUMN `paymentMethod` enum('bank_transfer','check','custody') DEFAULT 'bank_transfer';--> statement-breakpoint
ALTER TABLE `disbursement_orders` ADD `beneficiaryAccountName` varchar(255);--> statement-breakpoint
ALTER TABLE `disbursement_orders` ADD `sadadNumber` varchar(50);--> statement-breakpoint
ALTER TABLE `disbursement_orders` ADD `billerCode` varchar(50);