ALTER TABLE `mosque_requests` ADD `finalReportAssignedTo` int;--> statement-breakpoint
ALTER TABLE `mosque_requests` ADD `quickResponseStartDate` datetime;--> statement-breakpoint
ALTER TABLE `mosque_requests` ADD `quickResponseEndDate` datetime;--> statement-breakpoint
ALTER TABLE `mosque_requests` ADD `quickResponseScheduledDate` datetime;--> statement-breakpoint
ALTER TABLE `mosque_requests` ADD `quickResponseScheduledTime` varchar(10);--> statement-breakpoint
ALTER TABLE `mosque_requests` ADD `finalReportScheduledDate` datetime;--> statement-breakpoint
ALTER TABLE `mosque_requests` ADD `finalReportScheduledTime` varchar(10);--> statement-breakpoint
ALTER TABLE `roles` ADD `receiveBeneficiaryNotifications` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `roles` ADD `receiveRequestNotifications` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `roles` ADD `receiveFinancialAndContractNotifications` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `roles` ADD `receiveBeneficiaryEmail` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `roles` ADD `receiveRequestEmail` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `roles` ADD `receiveFinancialEmail` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `roles` ADD `receiveBeneficiaryWhatsapp` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `roles` ADD `receiveRequestWhatsapp` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `roles` ADD `receiveFinancialWhatsapp` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `roles` ADD `receiveBeneficiarySms` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `roles` ADD `receiveRequestSms` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `roles` ADD `receiveFinancialSms` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `receiveBeneficiaryNotifications` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `receiveRequestNotifications` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `receiveFinancialAndContractNotifications` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `receiveBeneficiaryEmail` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `receiveRequestEmail` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `receiveFinancialEmail` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `receiveBeneficiaryWhatsapp` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `receiveRequestWhatsapp` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `receiveFinancialWhatsapp` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `receiveBeneficiarySms` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `receiveRequestSms` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `receiveFinancialSms` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `mosque_requests` ADD CONSTRAINT `mosque_requests_finalReportAssignedTo_users_id_fk` FOREIGN KEY (`finalReportAssignedTo`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;