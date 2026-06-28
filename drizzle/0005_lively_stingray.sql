DROP TABLE `category_values`;--> statement-breakpoint
ALTER TABLE `contracts_enhanced` ADD `supportingEntity` varchar(1000);--> statement-breakpoint
ALTER TABLE `contracts_enhanced` ADD `supportType` varchar(50);--> statement-breakpoint
ALTER TABLE `contracts_enhanced` ADD `supportedAmount` decimal(15,2);--> statement-breakpoint
ALTER TABLE `organization_settings` ADD `officialReportsName` varchar(255);--> statement-breakpoint
ALTER TABLE `organization_settings` ADD `pmoManagerName` varchar(255);--> statement-breakpoint
ALTER TABLE `organization_settings` ADD `csrManagerName` varchar(255);