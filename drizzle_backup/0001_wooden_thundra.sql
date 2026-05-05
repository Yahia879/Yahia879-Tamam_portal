CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`action` varchar(100) NOT NULL,
	`entityType` varchar(50) NOT NULL,
	`entityId` int,
	`oldValues` json,
	`newValues` json,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `brand_colors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`colorType` enum('primary','secondary','accent','background','text') DEFAULT 'primary',
	`hexValue` varchar(7) NOT NULL,
	`isActive` boolean DEFAULT true,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	`updatedAt` datetime NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brand_colors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `brand_logos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`logoType` enum('primary','secondary','white','dark','icon') DEFAULT 'primary',
	`imageUrl` varchar(500) NOT NULL,
	`isActive` boolean DEFAULT true,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	`updatedAt` datetime NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brand_logos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `brand_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(100) NOT NULL,
	`settingValue` text,
	`settingType` varchar(50),
	`description` varchar(255),
	`updatedBy` int,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	`updatedAt` datetime NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brand_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `brand_settings_settingKey_unique` UNIQUE(`settingKey`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`nameAr` varchar(100) NOT NULL,
	`type` varchar(50) NOT NULL,
	`parentId` int,
	`sortOrder` int DEFAULT 0,
	`isActive` boolean DEFAULT true,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `category_values` (
	`id` int AUTO_INCREMENT NOT NULL,
	`categoryId` int NOT NULL,
	`value` varchar(255) NOT NULL,
	`valueAr` varchar(255) NOT NULL,
	`sortOrder` int DEFAULT 0,
	`isActive` boolean DEFAULT true,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	CONSTRAINT `category_values_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contractNumber` varchar(50) NOT NULL,
	`projectId` int NOT NULL,
	`supplierId` int,
	`contractType` varchar(100),
	`amount` decimal(15,2) NOT NULL,
	`startDate` datetime,
	`endDate` datetime,
	`status` enum('draft','active','completed','terminated') DEFAULT 'draft',
	`terms` text,
	`documentUrl` varchar(500),
	`createdAt` datetime NOT NULL DEFAULT (now()),
	`updatedAt` datetime NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contracts_id` PRIMARY KEY(`id`),
	CONSTRAINT `contracts_contractNumber_unique` UNIQUE(`contractNumber`)
);
--> statement-breakpoint
CREATE TABLE `donation_opportunities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int,
	`projectId` int,
	`title` varchar(255) NOT NULL,
	`description` text,
	`targetAmount` decimal(15,2) NOT NULL,
	`collectedAmount` decimal(15,2) DEFAULT '0',
	`status` enum('active','completed','closed') DEFAULT 'active',
	`startDate` datetime,
	`endDate` datetime,
	`isPublic` boolean DEFAULT true,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	`updatedAt` datetime NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `donation_opportunities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `donations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`opportunityId` int,
	`donorName` varchar(255),
	`donorPhone` varchar(20),
	`donorEmail` varchar(320),
	`amount` decimal(15,2) NOT NULL,
	`paymentMethod` varchar(50),
	`isAnonymous` boolean DEFAULT false,
	`status` enum('pending','confirmed','cancelled') DEFAULT 'pending',
	`transactionId` varchar(255),
	`notes` text,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	CONSTRAINT `donations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`employeeNumber` varchar(50),
	`department` varchar(100),
	`position` varchar(100),
	`hireDate` datetime,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	`updatedAt` datetime NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `field_visit_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`visitedBy` int NOT NULL,
	`visitDate` datetime NOT NULL,
	`findings` text,
	`recommendations` text,
	`estimatedCost` decimal(15,2),
	`technicalNeeds` text,
	`conditionRating` enum('excellent','good','fair','poor','critical'),
	`createdAt` datetime NOT NULL DEFAULT (now()),
	`updatedAt` datetime NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `field_visit_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `final_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`projectId` int,
	`preparedBy` int NOT NULL,
	`summary` text,
	`achievements` text,
	`challenges` text,
	`totalCost` decimal(15,2),
	`completionDate` datetime,
	`satisfactionRating` int,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	`updatedAt` datetime NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `final_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `homepage_customization` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sectionKey` varchar(100) NOT NULL,
	`title` varchar(255),
	`titleAr` varchar(255),
	`subtitle` text,
	`subtitleAr` text,
	`content` text,
	`contentAr` text,
	`imageUrl` varchar(500),
	`iconName` varchar(100),
	`sortOrder` int DEFAULT 0,
	`isVisible` boolean DEFAULT true,
	`updatedBy` int,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	`updatedAt` datetime NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `homepage_customization_id` PRIMARY KEY(`id`),
	CONSTRAINT `homepage_customization_sectionKey_unique` UNIQUE(`sectionKey`)
);
--> statement-breakpoint
CREATE TABLE `mosque_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mosqueId` int NOT NULL,
	`imageUrl` varchar(500) NOT NULL,
	`imageType` varchar(50),
	`caption` varchar(255),
	`createdAt` datetime NOT NULL DEFAULT (now()),
	CONSTRAINT `mosque_images_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mosque_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestNumber` varchar(50) NOT NULL,
	`mosqueId` int NOT NULL,
	`userId` int NOT NULL,
	`programType` enum('bunyan','daaem','enaya','emdad','ethraa','sedana','taqa','miyah','suqya') NOT NULL,
	`currentStage` enum('submitted','initial_review','field_visit','technical_eval','financial_eval','execution','closed') NOT NULL DEFAULT 'submitted',
	`status` enum('pending','under_review','approved','rejected','suspended','in_progress','completed') NOT NULL DEFAULT 'pending',
	`priority` enum('urgent','medium','normal') DEFAULT 'normal',
	`assignedTo` int,
	`programData` json,
	`estimatedCost` decimal(15,2),
	`approvedBudget` decimal(15,2),
	`submittedAt` datetime NOT NULL DEFAULT (now()),
	`reviewedAt` datetime,
	`approvedAt` datetime,
	`completedAt` datetime,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	`updatedAt` datetime NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mosque_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `mosque_requests_requestNumber_unique` UNIQUE(`requestNumber`)
);
--> statement-breakpoint
CREATE TABLE `mosques` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`latitude` decimal(10,8),
	`longitude` decimal(11,8),
	`address` text,
	`city` varchar(100) NOT NULL,
	`district` varchar(100),
	`area` decimal(10,2),
	`capacity` int,
	`status` enum('new','existing','under_construction') NOT NULL DEFAULT 'new',
	`ownership` enum('government','waqf','private') NOT NULL DEFAULT 'waqf',
	`imamName` varchar(255),
	`imamPhone` varchar(20),
	`imamEmail` varchar(320),
	`registeredBy` int,
	`approvedBy` int,
	`approvalStatus` enum('pending','approved','rejected') DEFAULT 'pending',
	`approvalDate` datetime,
	`notes` text,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	`updatedAt` datetime NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mosques_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`type` enum('info','success','warning','error','request_update','system') DEFAULT 'info',
	`relatedType` varchar(50),
	`relatedId` int,
	`isRead` boolean DEFAULT false,
	`readAt` datetime,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `partners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`nameAr` varchar(255),
	`description` text,
	`descriptionAr` text,
	`logoUrl` varchar(500),
	`websiteUrl` varchar(500),
	`partnerType` enum('strategic','sponsor','supporter','media') DEFAULT 'supporter',
	`sortOrder` int DEFAULT 0,
	`isActive` boolean DEFAULT true,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	`updatedAt` datetime NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `partners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`expiresAt` datetime NOT NULL,
	`used` boolean DEFAULT false,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	CONSTRAINT `password_reset_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `password_reset_tokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`paymentNumber` varchar(50) NOT NULL,
	`projectId` int,
	`contractId` int,
	`amount` decimal(15,2) NOT NULL,
	`paymentType` enum('advance','progress','final','retention') DEFAULT 'progress',
	`status` enum('pending','approved','paid','rejected') DEFAULT 'pending',
	`approvedBy` int,
	`paidAt` datetime,
	`description` text,
	`documentUrl` varchar(500),
	`createdAt` datetime NOT NULL DEFAULT (now()),
	`updatedAt` datetime NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_paymentNumber_unique` UNIQUE(`paymentNumber`)
);
--> statement-breakpoint
CREATE TABLE `project_phases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`phaseName` varchar(255) NOT NULL,
	`phaseOrder` int NOT NULL,
	`description` text,
	`status` enum('pending','in_progress','completed') DEFAULT 'pending',
	`startDate` datetime,
	`endDate` datetime,
	`completionPercentage` int DEFAULT 0,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	`updatedAt` datetime NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_phases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectNumber` varchar(50) NOT NULL,
	`requestId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`managerId` int,
	`status` enum('planning','in_progress','on_hold','completed','cancelled') DEFAULT 'planning',
	`budget` decimal(15,2),
	`actualCost` decimal(15,2),
	`startDate` datetime,
	`expectedEndDate` datetime,
	`actualEndDate` datetime,
	`completionPercentage` int DEFAULT 0,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	`updatedAt` datetime NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`),
	CONSTRAINT `projects_projectNumber_unique` UNIQUE(`projectNumber`)
);
--> statement-breakpoint
CREATE TABLE `quantity_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int,
	`projectId` int,
	`itemName` varchar(255) NOT NULL,
	`itemDescription` text,
	`unit` varchar(50) NOT NULL,
	`quantity` decimal(15,3) NOT NULL,
	`unitPrice` decimal(15,2),
	`totalPrice` decimal(15,2),
	`category` varchar(100),
	`createdAt` datetime NOT NULL DEFAULT (now()),
	`updatedAt` datetime NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quantity_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quick_response_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`respondedBy` int NOT NULL,
	`responseDate` datetime NOT NULL,
	`issueDescription` text,
	`actionsTaken` text,
	`resolved` boolean DEFAULT false,
	`requiresProject` boolean DEFAULT false,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	`updatedAt` datetime NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quick_response_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quotationNumber` varchar(50) NOT NULL,
	`requestId` int,
	`projectId` int,
	`supplierId` int NOT NULL,
	`totalAmount` decimal(15,2) NOT NULL,
	`validUntil` datetime,
	`status` enum('pending','accepted','rejected','expired') DEFAULT 'pending',
	`items` json,
	`notes` text,
	`documentUrl` varchar(500),
	`createdAt` datetime NOT NULL DEFAULT (now()),
	`updatedAt` datetime NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quotations_id` PRIMARY KEY(`id`),
	CONSTRAINT `quotations_quotationNumber_unique` UNIQUE(`quotationNumber`)
);
--> statement-breakpoint
CREATE TABLE `request_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` varchar(500) NOT NULL,
	`fileType` varchar(50),
	`fileSize` int,
	`uploadedBy` int,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	CONSTRAINT `request_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `request_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`userId` int NOT NULL,
	`comment` text NOT NULL,
	`isInternal` boolean DEFAULT false,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	CONSTRAINT `request_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `request_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`userId` int NOT NULL,
	`fromStage` enum('submitted','initial_review','field_visit','technical_eval','financial_eval','execution','closed'),
	`toStage` enum('submitted','initial_review','field_visit','technical_eval','financial_eval','execution','closed'),
	`fromStatus` enum('pending','under_review','approved','rejected','suspended','in_progress','completed'),
	`toStatus` enum('pending','under_review','approved','rejected','suspended','in_progress','completed'),
	`action` varchar(100) NOT NULL,
	`notes` text,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	CONSTRAINT `request_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('contractor','supplier','service_provider') DEFAULT 'supplier',
	`contactPerson` varchar(255),
	`phone` varchar(20),
	`email` varchar(320),
	`address` text,
	`commercialRegister` varchar(50),
	`taxNumber` varchar(50),
	`rating` int,
	`status` enum('active','inactive','blacklisted') DEFAULT 'active',
	`notes` text,
	`createdAt` datetime NOT NULL DEFAULT (now()),
	`updatedAt` datetime NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `openId` varchar(64);--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `name` text NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `email` varchar(320) NOT NULL;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `loginMethod` varchar(64) DEFAULT 'local';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('super_admin','system_admin','projects_office','field_team','quick_response','financial','project_manager','corporate_comm','service_requester') NOT NULL DEFAULT 'service_requester';--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `nationalId` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `status` enum('pending','active','suspended','blocked') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `city` varchar(100);--> statement-breakpoint
ALTER TABLE `users` ADD `requesterType` varchar(50);--> statement-breakpoint
ALTER TABLE `users` ADD `proofDocument` varchar(500);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE(`email`);--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `brand_settings` ADD CONSTRAINT `brand_settings_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `category_values` ADD CONSTRAINT `category_values_categoryId_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_supplierId_suppliers_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donation_opportunities` ADD CONSTRAINT `donation_opportunities_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donation_opportunities` ADD CONSTRAINT `donation_opportunities_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donations` ADD CONSTRAINT `donations_opportunityId_donation_opportunities_id_fk` FOREIGN KEY (`opportunityId`) REFERENCES `donation_opportunities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employees` ADD CONSTRAINT `employees_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `field_visit_reports` ADD CONSTRAINT `field_visit_reports_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `field_visit_reports` ADD CONSTRAINT `field_visit_reports_visitedBy_users_id_fk` FOREIGN KEY (`visitedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `final_reports` ADD CONSTRAINT `final_reports_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `final_reports` ADD CONSTRAINT `final_reports_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `final_reports` ADD CONSTRAINT `final_reports_preparedBy_users_id_fk` FOREIGN KEY (`preparedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `homepage_customization` ADD CONSTRAINT `homepage_customization_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mosque_images` ADD CONSTRAINT `mosque_images_mosqueId_mosques_id_fk` FOREIGN KEY (`mosqueId`) REFERENCES `mosques`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mosque_requests` ADD CONSTRAINT `mosque_requests_mosqueId_mosques_id_fk` FOREIGN KEY (`mosqueId`) REFERENCES `mosques`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mosque_requests` ADD CONSTRAINT `mosque_requests_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mosque_requests` ADD CONSTRAINT `mosque_requests_assignedTo_users_id_fk` FOREIGN KEY (`assignedTo`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mosques` ADD CONSTRAINT `mosques_registeredBy_users_id_fk` FOREIGN KEY (`registeredBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mosques` ADD CONSTRAINT `mosques_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_contractId_contracts_id_fk` FOREIGN KEY (`contractId`) REFERENCES `contracts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_phases` ADD CONSTRAINT `project_phases_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_managerId_users_id_fk` FOREIGN KEY (`managerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quantity_schedules` ADD CONSTRAINT `quantity_schedules_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quantity_schedules` ADD CONSTRAINT `quantity_schedules_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quick_response_reports` ADD CONSTRAINT `quick_response_reports_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quick_response_reports` ADD CONSTRAINT `quick_response_reports_respondedBy_users_id_fk` FOREIGN KEY (`respondedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_supplierId_suppliers_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `request_attachments` ADD CONSTRAINT `request_attachments_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `request_attachments` ADD CONSTRAINT `request_attachments_uploadedBy_users_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `request_comments` ADD CONSTRAINT `request_comments_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `request_comments` ADD CONSTRAINT `request_comments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `request_history` ADD CONSTRAINT `request_history_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `request_history` ADD CONSTRAINT `request_history_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;