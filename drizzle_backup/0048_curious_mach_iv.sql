ALTER TABLE `quantity_schedules` DROP FOREIGN KEY `quantity_schedules_requestId_mosque_requests_id_fk`;
--> statement-breakpoint
ALTER TABLE `quantity_schedules` DROP FOREIGN KEY `quantity_schedules_projectId_projects_id_fk`;
--> statement-breakpoint
ALTER TABLE `quantity_schedules` ADD CONSTRAINT `quantity_schedules_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quantity_schedules` ADD CONSTRAINT `quantity_schedules_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;