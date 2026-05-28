ALTER TABLE `mosque_requests` ADD `fieldVisitAssignedTo` int;--> statement-breakpoint
ALTER TABLE `mosque_requests` ADD `fieldVisitScheduledDate` datetime;--> statement-breakpoint
ALTER TABLE `mosque_requests` ADD `fieldVisitScheduledTime` varchar(10);--> statement-breakpoint
ALTER TABLE `mosque_requests` ADD `fieldVisitNotes` text;--> statement-breakpoint
ALTER TABLE `mosque_requests` ADD CONSTRAINT `mosque_requests_fieldVisitAssignedTo_users_id_fk` FOREIGN KEY (`fieldVisitAssignedTo`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;