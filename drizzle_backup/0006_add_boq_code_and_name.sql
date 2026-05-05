ALTER TABLE `quantity_schedules` ADD `boqCode` varchar(50);--> statement-breakpoint
ALTER TABLE `quantity_schedules` ADD `boqName` varchar(255);--> statement-breakpoint
ALTER TABLE `quantity_schedules` ADD CONSTRAINT `quantity_schedules_boqCode_unique` UNIQUE(`boqCode`);