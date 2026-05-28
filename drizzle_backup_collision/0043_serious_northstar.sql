ALTER TABLE `mosque_requests` ADD `currentResponsible` int;--> statement-breakpoint
ALTER TABLE `mosque_requests` ADD `currentResponsibleDepartment` varchar(100);--> statement-breakpoint
ALTER TABLE `mosque_requests` ADD CONSTRAINT `mosque_requests_currentResponsible_users_id_fk` FOREIGN KEY (`currentResponsible`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;