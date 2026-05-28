CREATE TABLE `action_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actionCode` varchar(100) NOT NULL,
	`actionLabel` varchar(255) NOT NULL,
	`actionDescription` text,
	`parentStage` varchar(100) NOT NULL,
	`order` int NOT NULL DEFAULT 0,
	`route` varchar(255),
	`requiredRoles` json,
	`prerequisiteAction` varchar(100),
	`nextAction` varchar(100),
	`relationWithNext` enum('before','after','concurrent','independent') DEFAULT 'after',
	`isActive` boolean NOT NULL DEFAULT true,
	`icon` varchar(50),
	`color` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `action_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `action_settings_actionCode_unique` UNIQUE(`actionCode`)
);
--> statement-breakpoint
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `authorized_signatories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`title` varchar(100) NOT NULL,
	`nationalId` varchar(20),
	`phone` varchar(20),
	`email` varchar(320),
	`address` text,
	`signatureUrl` varchar(500),
	`isActive` boolean DEFAULT true,
	`isDefault` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `authorized_signatories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `boq_items` (
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `boq_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `brand_colors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`colorType` enum('primary','secondary','accent','background','text') DEFAULT 'primary',
	`hexValue` varchar(7) NOT NULL,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brand_colors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `brand_logos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`logoType` enum('primary','secondary','white','dark','icon') DEFAULT 'primary',
	`imageUrl` varchar(500) NOT NULL,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `category_values_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contract_clause_values` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contractId` int NOT NULL,
	`clauseId` int,
	`title` varchar(255),
	`customContent` text,
	`orderIndex` int DEFAULT 0,
	`isIncluded` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contract_clause_values_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contract_clauses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int,
	`title` varchar(255) NOT NULL,
	`titleAr` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`category` enum('obligations_first_party','obligations_second_party','financial','duration','modifications','notifications','general','confidentiality','intellectual_property','disputes','termination','penalties','warranty','force_majeure','copies','custom') DEFAULT 'general',
	`orderIndex` int DEFAULT 0,
	`isRequired` boolean DEFAULT false,
	`isEditable` boolean DEFAULT true,
	`isGlobal` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contract_clauses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contract_modification_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contractId` int NOT NULL,
	`modificationRequestId` int,
	`fieldName` varchar(100) NOT NULL,
	`oldValue` text,
	`newValue` text,
	`modifiedBy` int NOT NULL,
	`modifiedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contract_modification_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contract_modification_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contractId` int NOT NULL,
	`modificationType` varchar(50) NOT NULL,
	`description` text NOT NULL,
	`currentValue` text,
	`newValue` text,
	`justification` text NOT NULL,
	`status` enum('pending','approved','rejected') DEFAULT 'pending',
	`requestedBy` int NOT NULL,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedBy` int,
	`reviewedAt` datetime,
	`reviewNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contract_modification_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contract_number_sequence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL,
	`lastSequence` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contract_number_sequence_id` PRIMARY KEY(`id`),
	CONSTRAINT `contract_number_sequence_year_unique` UNIQUE(`year`)
);
--> statement-breakpoint
CREATE TABLE `contract_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contractId` int NOT NULL,
	`phaseName` varchar(255) NOT NULL,
	`phaseOrder` int NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`dueDate` datetime,
	`status` enum('pending','due','paid') DEFAULT 'pending',
	`paidAt` datetime,
	`paidBy` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contract_payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contract_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`nameAr` varchar(255) NOT NULL,
	`type` enum('supervision','construction','supply','maintenance','consulting') NOT NULL,
	`description` text,
	`headerTemplate` text,
	`introTemplate` text,
	`footerTemplate` text,
	`signatureTemplate` text,
	`isActive` boolean DEFAULT true,
	`isDefault` boolean DEFAULT false,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contract_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contractNumber` varchar(50) NOT NULL,
	`projectId` int NOT NULL,
	`supplierId` int,
	`signatoryId` int,
	`contractType` varchar(100),
	`amount` decimal(15,2) NOT NULL,
	`startDate` datetime,
	`endDate` datetime,
	`status` enum('draft','active','completed','terminated') DEFAULT 'draft',
	`terms` text,
	`documentUrl` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contracts_id` PRIMARY KEY(`id`),
	CONSTRAINT `contracts_contractNumber_unique` UNIQUE(`contractNumber`)
);
--> statement-breakpoint
CREATE TABLE `contracts_enhanced` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contractNumber` varchar(50) NOT NULL,
	`contractYear` int NOT NULL,
	`contractSequence` int NOT NULL,
	`templateId` int,
	`contractType` enum('supervision','construction','supply','maintenance','consulting') NOT NULL,
	`contractTitle` varchar(500) NOT NULL,
	`projectId` int,
	`requestId` int,
	`signatoryId` int,
	`supplierId` int,
	`secondPartyName` varchar(255) NOT NULL,
	`secondPartyCommercialRegister` varchar(50),
	`secondPartyRepresentative` varchar(255),
	`secondPartyTitle` varchar(100),
	`secondPartyAddress` text,
	`secondPartyPhone` varchar(20),
	`secondPartyEmail` varchar(320),
	`secondPartyBankName` varchar(255),
	`secondPartyIban` varchar(50),
	`secondPartyAccountName` varchar(255),
	`mosqueName` varchar(255),
	`mosqueNeighborhood` varchar(255),
	`mosqueCity` varchar(100),
	`contractAmount` decimal(15,2) NOT NULL,
	`contractAmountText` varchar(500),
	`duration` int NOT NULL,
	`durationUnit` enum('days','weeks','months') DEFAULT 'months',
	`contractDate` datetime,
	`contractDateHijri` varchar(50),
	`startDate` datetime,
	`endDate` datetime,
	`status` enum('draft','pending_approval','approved','active','completed','terminated','cancelled') DEFAULT 'draft',
	`customTerms` text,
	`customNotifications` text,
	`customGeneralTerms` text,
	`paymentScheduleJson` text,
	`clauseValuesJson` text,
	`documentUrl` varchar(500),
	`signedDocumentUrl` varchar(500),
	`approvedBy` int,
	`approvedAt` datetime,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contracts_enhanced_id` PRIMARY KEY(`id`),
	CONSTRAINT `contracts_enhanced_contractNumber_unique` UNIQUE(`contractNumber`)
);
--> statement-breakpoint
CREATE TABLE `disbursement_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(50) NOT NULL,
	`disbursementRequestId` int NOT NULL,
	`amount` decimal(15,2) NOT NULL,
	`beneficiaryName` varchar(255) NOT NULL,
	`beneficiaryBank` varchar(255),
	`beneficiaryIban` varchar(50),
	`paymentMethod` varchar(50) DEFAULT 'bank_transfer',
	`beneficiaryAccountName` varchar(255),
	`sadadNumber` varchar(50),
	`billerCode` varchar(50),
	`status` enum('draft','pending','approved','rejected','executed') DEFAULT 'draft',
	`createdBy` int NOT NULL,
	`approvedBy` int,
	`approvedAt` datetime,
	`approvalNotes` text,
	`executedBy` int,
	`executedAt` datetime,
	`transactionReference` varchar(255),
	`rejectedBy` int,
	`rejectedAt` datetime,
	`rejectionReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `disbursement_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `disbursement_orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `disbursement_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestNumber` varchar(50) NOT NULL,
	`projectId` int NOT NULL,
	`contractId` int,
	`contractPaymentId` int,
	`title` varchar(255),
	`description` text,
	`amount` decimal(15,2) NOT NULL,
	`paymentType` enum('advance','progress','final','retention') DEFAULT 'progress',
	`completionPercentage` int,
	`attachmentsJson` text,
	`status` enum('draft','pending','approved','rejected','paid') DEFAULT 'draft',
	`requestedBy` int NOT NULL,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`approvedBy` int,
	`approvedAt` datetime,
	`approvalNotes` text,
	`rejectedBy` int,
	`rejectedAt` datetime,
	`rejectionReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `disbursement_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `disbursement_requests_requestNumber_unique` UNIQUE(`requestNumber`)
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `escalation_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`stageCode` varchar(50) NOT NULL,
	`escalationLevel` int NOT NULL,
	`escalatedTo` int NOT NULL,
	`escalatedFrom` int,
	`reason` text,
	`delayDays` int NOT NULL,
	`isResolved` boolean DEFAULT false,
	`resolvedAt` datetime,
	`resolvedBy` int,
	`resolution` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `escalation_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `field_visit_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`visitedBy` int NOT NULL,
	`visitDate` datetime NOT NULL,
	`mosqueCondition` varchar(100),
	`conditionRating` enum('excellent','good','fair','poor','critical'),
	`menPrayerLength` decimal(10,2),
	`menPrayerWidth` decimal(10,2),
	`menPrayerHeight` decimal(10,2),
	`womenPrayerExists` boolean DEFAULT false,
	`womenPrayerLength` decimal(10,2),
	`womenPrayerWidth` decimal(10,2),
	`womenPrayerHeight` decimal(10,2),
	`requiredNeeds` text,
	`generalDescription` text,
	`findings` text,
	`recommendations` text,
	`estimatedCost` decimal(15,2),
	`technicalNeeds` text,
	`teamMember1` varchar(255),
	`teamMember2` varchar(255),
	`teamMember3` varchar(255),
	`teamMember4` varchar(255),
	`teamMember5` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `field_visit_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `field_visits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`scheduledDate` datetime,
	`scheduledTime` varchar(10),
	`assignedTo` int,
	`teamMembers` text,
	`scheduleNotes` text,
	`scheduledBy` int,
	`scheduledAt` datetime,
	`executionDate` datetime,
	`executionTime` varchar(10),
	`attendees` text,
	`executionNotes` text,
	`executedBy` int,
	`executedAt` datetime,
	`reportSubmitted` boolean DEFAULT false,
	`reportSubmittedBy` int,
	`reportSubmittedAt` datetime,
	`status` enum('scheduled','executed','reported','completed') DEFAULT 'scheduled',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `field_visits_id` PRIMARY KEY(`id`)
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `final_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `handovers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`requestId` int NOT NULL,
	`type` enum('preliminary','warranty','final') NOT NULL,
	`handoverDate` date,
	`completionPercentage` decimal(5,2) DEFAULT '0',
	`notes` text,
	`documentUrl` text,
	`photosUrls` json,
	`status` enum('pending','approved','rejected','completed') NOT NULL DEFAULT 'pending',
	`approvedBy` int,
	`approvedAt` datetime,
	`approvalNotes` text,
	`warrantyStartDate` date,
	`warrantyEndDate` date,
	`warrantyDurationMonths` int,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `handovers_id` PRIMARY KEY(`id`)
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `homepage_customization_id` PRIMARY KEY(`id`),
	CONSTRAINT `homepage_customization_sectionKey_unique` UNIQUE(`sectionKey`)
);
--> statement-breakpoint
CREATE TABLE `job_positions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nameAr` varchar(100) NOT NULL,
	`nameEn` varchar(100),
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `job_positions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `modules` (
	`id` varchar(50) NOT NULL,
	`name_ar` varchar(100) NOT NULL,
	`name_en` varchar(100) NOT NULL,
	`description` text,
	`icon` varchar(50),
	`display_order` int,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `modules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mosque_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mosqueId` int NOT NULL,
	`imageUrl` varchar(500) NOT NULL,
	`imageType` varchar(50),
	`caption` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mosque_images_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mosque_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestNumber` varchar(50) NOT NULL,
	`mosqueId` int,
	`userId` int NOT NULL,
	`programType` enum('bunyan','daaem','enaya','emdad','ethraa','sedana','taqa','miyah','suqya') NOT NULL,
	`currentStage` enum('submitted','initial_review','field_visit','technical_eval','boq_preparation','financial_eval_and_approval','contracting','execution','handover','closed') NOT NULL DEFAULT 'submitted',
	`status` enum('pending','under_review','approved','rejected','suspended','in_progress','completed') NOT NULL DEFAULT 'pending',
	`priority` enum('urgent','medium','normal') DEFAULT 'normal',
	`assignedTo` int,
	`currentResponsible` int,
	`currentResponsibleDepartment` varchar(100),
	`reviewCompleted` boolean DEFAULT false,
	`reviewNotes` text,
	`fieldVisitAssignedTo` int,
	`fieldVisitScheduledDate` datetime,
	`fieldVisitScheduledTime` varchar(10),
	`fieldVisitNotes` text,
	`fieldVisitContactName` varchar(255),
	`fieldVisitContactTitle` varchar(100),
	`fieldVisitContactPhone` varchar(20),
	`programData` json,
	`requestTrack` enum('standard','quick_response','rejected') DEFAULT 'standard',
	`technicalEvalDecision` varchar(50),
	`technicalEvalJustification` text,
	`estimatedCost` decimal(15,2),
	`approvedBudget` decimal(15,2),
	`selectedQuotationId` varchar(50),
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	`reviewedAt` datetime,
	`approvedAt` datetime,
	`completedAt` datetime,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
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
	`governorate` varchar(100),
	`center` varchar(100),
	`area` decimal(10,2),
	`capacity` int,
	`hasPrayerHall` boolean DEFAULT false,
	`mosqueAge` int,
	`imamName` varchar(255),
	`imamPhone` varchar(20),
	`imamEmail` varchar(320),
	`registeredBy` int,
	`approvedBy` int,
	`approvalStatus` enum('pending','approved','rejected') DEFAULT 'pending',
	`approvalDate` datetime,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organization_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`organizationName` varchar(255) NOT NULL,
	`organizationNameShort` varchar(100),
	`licenseNumber` varchar(50),
	`administrativeSupervisor` varchar(255),
	`technicalSupervisor` varchar(255),
	`boardChairmanName` varchar(255),
	`executiveDirectorName` varchar(255),
	`accountantName` varchar(255),
	`aboutOrganization` text,
	`address` text,
	`city` varchar(100),
	`phone` varchar(20),
	`email` varchar(320),
	`website` varchar(255),
	`logoUrl` varchar(500),
	`stampUrl` varchar(500),
	`secondaryLogoUrl` varchar(500),
	`bankName` varchar(100),
	`bankAccountName` varchar(255),
	`iban` varchar(34),
	`contractPrefix` varchar(10) DEFAULT 'CON',
	`contractFooterText` text,
	`contractTermsAndConditions` text,
	`colorPrimary1` varchar(7) DEFAULT '#09707e',
	`colorPrimary2` varchar(7) DEFAULT '#0891b2',
	`colorSecondary1` varchar(7) DEFAULT '#6366f1',
	`colorSecondary2` varchar(7) DEFAULT '#f59e0b',
	`colorSecondary3` varchar(7) DEFAULT '#ef4444',
	`colorSecondary4` varchar(7) DEFAULT '#8b5cf6',
	`colorSecondary5` varchar(7) DEFAULT '#10b981',
	`authorizedSignatory` varchar(255),
	`signatoryTitle` varchar(100),
	`signatoryPhone` varchar(20),
	`signatoryEmail` varchar(320),
	`updatedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organization_settings_id` PRIMARY KEY(`id`)
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `partners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`token` varchar(255) NOT NULL,
	`expiresAt` datetime NOT NULL,
	`used` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_paymentNumber_unique` UNIQUE(`paymentNumber`)
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` varchar(100) NOT NULL,
	`module_id` varchar(50) NOT NULL,
	`action` varchar(50) NOT NULL,
	`name_ar` varchar(100) NOT NULL,
	`name_en` varchar(100) NOT NULL,
	`description` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `permissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `permissions_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`action_type` varchar(50) NOT NULL,
	`target_user_id` int NOT NULL,
	`target_role_id` varchar(50),
	`permission_id` varchar(100),
	`performed_by` int NOT NULL,
	`reason` text,
	`old_value` text,
	`new_value` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `permissions_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `progress_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reportNumber` varchar(50) NOT NULL,
	`projectId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`reportDate` date NOT NULL,
	`reportPeriodStart` date,
	`reportPeriodEnd` date,
	`overallProgress` int DEFAULT 0,
	`plannedProgress` int DEFAULT 0,
	`actualProgress` int DEFAULT 0,
	`variance` int DEFAULT 0,
	`workSummary` text,
	`challenges` text,
	`nextSteps` text,
	`recommendations` text,
	`budgetSpent` decimal(15,2) DEFAULT '0',
	`budgetRemaining` decimal(15,2) DEFAULT '0',
	`attachments` json,
	`photos` json,
	`status` enum('draft','submitted','reviewed','approved') DEFAULT 'draft',
	`createdBy` int NOT NULL,
	`reviewedBy` int,
	`reviewedAt` datetime,
	`reviewNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `progress_reports_id` PRIMARY KEY(`id`),
	CONSTRAINT `progress_reports_reportNumber_unique` UNIQUE(`reportNumber`)
);
--> statement-breakpoint
CREATE TABLE `project_number_sequence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL,
	`lastSequence` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_number_sequence_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_number_sequence_year_unique` UNIQUE(`year`)
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`),
	CONSTRAINT `projects_projectNumber_unique` UNIQUE(`projectNumber`)
);
--> statement-breakpoint
CREATE TABLE `quantity_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int,
	`projectId` int,
	`boqCode` varchar(50),
	`boqName` varchar(255),
	`itemName` varchar(255) NOT NULL,
	`itemDescription` text,
	`unit` varchar(50) NOT NULL,
	`quantity` decimal(15,3) NOT NULL,
	`unitPrice` decimal(15,2),
	`totalPrice` decimal(15,2),
	`category` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quantity_schedules_id` PRIMARY KEY(`id`),
	CONSTRAINT `quantity_schedules_boqCode_unique` UNIQUE(`boqCode`)
);
--> statement-breakpoint
CREATE TABLE `quick_response_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`respondedBy` int NOT NULL,
	`responseDate` datetime NOT NULL,
	`technicalEvaluation` text,
	`finalEvaluation` text,
	`unexecutedWorks` text,
	`technicianName` varchar(255),
	`issueDescription` text,
	`actionsTaken` text,
	`resolved` boolean DEFAULT false,
	`requiresProject` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
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
	`includesTax` boolean DEFAULT false,
	`taxRate` decimal(5,2) DEFAULT '15.00',
	`taxAmount` decimal(15,2),
	`discountType` enum('percentage','fixed'),
	`discountValue` decimal(15,2),
	`discountAmount` decimal(15,2),
	`finalAmount` decimal(15,2),
	`negotiatedAmount` decimal(15,2),
	`negotiationNotes` text,
	`negotiatedBy` int,
	`negotiatedAt` datetime,
	`approvedAmount` decimal(15,2),
	`validUntil` datetime,
	`status` enum('pending','negotiating','accepted','approved','rejected','expired') DEFAULT 'pending',
	`items` json,
	`notes` text,
	`documentUrl` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
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
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `request_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `request_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`userId` int NOT NULL,
	`comment` text NOT NULL,
	`isInternal` boolean DEFAULT false,
	`isRead` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `request_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `request_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`userId` int NOT NULL,
	`fromStage` varchar(50),
	`toStage` varchar(50),
	`fromStatus` varchar(50),
	`toStatus` varchar(50),
	`action` varchar(100) NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `request_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `request_number_sequence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL,
	`lastSequence` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `request_number_sequence_id` PRIMARY KEY(`id`),
	CONSTRAINT `request_number_sequence_year_unique` UNIQUE(`year`)
);
--> statement-breakpoint
CREATE TABLE `request_stage_tracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`stageCode` varchar(50) NOT NULL,
	`subStageCode` varchar(50),
	`startedAt` timestamp DEFAULT (now()),
	`dueAt` datetime,
	`completedAt` datetime,
	`isDelayed` boolean DEFAULT false,
	`delayDays` int DEFAULT 0,
	`escalationLevel` int DEFAULT 0,
	`assignedTo` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `request_stage_tracking_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `request_sub_stage_tracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` int NOT NULL,
	`parentStageCode` varchar(50) NOT NULL,
	`subStageCode` varchar(50) NOT NULL,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`dueAt` datetime NOT NULL,
	`completedAt` datetime,
	`isDelayed` boolean DEFAULT false,
	`delayDays` int DEFAULT 0,
	`assignedTo` int,
	`completedBy` int,
	`notes` text,
	`actionData` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `request_sub_stage_tracking_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role_id` varchar(50) NOT NULL,
	`permission_id` varchar(100) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `role_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_role_permission` UNIQUE(`role_id`,`permission_id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` varchar(50) NOT NULL,
	`name_ar` varchar(100) NOT NULL,
	`name_en` varchar(100) NOT NULL,
	`description` text,
	`is_system` boolean NOT NULL DEFAULT false,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `satisfaction_surveys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`requestId` int NOT NULL,
	`type` enum('stakeholder','beneficiary') NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`questions` json NOT NULL,
	`status` enum('draft','published','closed') NOT NULL DEFAULT 'draft',
	`publishedAt` datetime,
	`closedAt` datetime,
	`surveyUrl` varchar(500),
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `satisfaction_surveys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `signatories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`title` varchar(100) NOT NULL,
	`nationalId` varchar(20),
	`phone` varchar(20),
	`email` varchar(320),
	`signatureUrl` varchar(500),
	`isDefault` boolean DEFAULT false,
	`isActive` boolean DEFAULT true,
	`sortOrder` int DEFAULT 0,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `signatories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stage_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stageCode` varchar(50) NOT NULL,
	`stageName` varchar(100) NOT NULL,
	`stageOrder` int NOT NULL DEFAULT 0,
	`durationDays` int NOT NULL DEFAULT 3,
	`warningDays` int DEFAULT 1,
	`escalationLevel1Days` int DEFAULT 1,
	`escalationLevel2Days` int DEFAULT 3,
	`isActive` boolean DEFAULT true,
	`description` text,
	`requiredConditions` text,
	`availableActions` text,
	`notificationTitle` varchar(200),
	`notificationMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stage_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `stage_settings_stageCode_unique` UNIQUE(`stageCode`)
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` enum('contractor','supplier','service_provider') DEFAULT 'supplier',
	`entityType` enum('company','establishment') DEFAULT 'establishment',
	`commercialRegister` varchar(50) NOT NULL,
	`commercialActivity` varchar(500),
	`yearsOfExperience` int,
	`workFields` json,
	`address` text,
	`city` varchar(100),
	`googleMapsUrl` varchar(500),
	`googleMapsLat` decimal(10,7),
	`googleMapsLng` decimal(10,7),
	`email` varchar(320) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`phoneSecondary` varchar(20),
	`contactPerson` varchar(255) NOT NULL,
	`contactPersonTitle` varchar(100),
	`bankAccountName` varchar(255),
	`bankName` varchar(255),
	`iban` varchar(50),
	`taxNumber` varchar(50),
	`commercialRegisterDoc` mediumtext,
	`vatCertificateDoc` mediumtext,
	`nationalAddressDoc` mediumtext,
	`approvalStatus` enum('pending','approved','rejected','suspended') DEFAULT 'pending',
	`approvedBy` int,
	`approvedAt` datetime,
	`rejectionReason` text,
	`status` enum('active','inactive','blacklisted') DEFAULT 'active',
	`rating` int,
	`notes` text,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suppliers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `survey_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`surveyId` int NOT NULL,
	`respondentName` varchar(255),
	`respondentEmail` varchar(255),
	`respondentPhone` varchar(20),
	`responses` json NOT NULL,
	`overallRating` decimal(3,2),
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `survey_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`permission_id` varchar(100) NOT NULL,
	`granted` boolean NOT NULL,
	`granted_by` int NOT NULL,
	`reason` text,
	`expires_at` datetime,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_permissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`role_id` varchar(50) NOT NULL,
	`assigned_by` int,
	`assigned_at` timestamp NOT NULL DEFAULT (now()),
	`expires_at` datetime,
	CONSTRAINT `user_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_user_role` UNIQUE(`user_id`,`role_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64),
	`email` varchar(320) NOT NULL,
	`passwordHash` varchar(255),
	`name` text NOT NULL,
	`phone` varchar(20),
	`nationalId` varchar(20),
	`role` enum('super_admin','system_admin','projects_office','field_team','quick_response','financial','project_manager','corporate_comm','service_requester') NOT NULL DEFAULT 'service_requester',
	`status` enum('pending','active','suspended','blocked') NOT NULL DEFAULT 'pending',
	`loginMethod` varchar(64) DEFAULT 'local',
	`city` varchar(100),
	`requesterType` varchar(50),
	`proofDocument` varchar(500),
	`mosqueExemptions` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `boq_items` ADD CONSTRAINT `boq_items_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `boq_items` ADD CONSTRAINT `boq_items_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `brand_settings` ADD CONSTRAINT `brand_settings_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `category_values` ADD CONSTRAINT `category_values_categoryId_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contract_clause_values` ADD CONSTRAINT `contract_clause_values_contractId_contracts_enhanced_id_fk` FOREIGN KEY (`contractId`) REFERENCES `contracts_enhanced`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contract_clause_values` ADD CONSTRAINT `contract_clause_values_clauseId_contract_clauses_id_fk` FOREIGN KEY (`clauseId`) REFERENCES `contract_clauses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contract_clauses` ADD CONSTRAINT `contract_clauses_templateId_contract_templates_id_fk` FOREIGN KEY (`templateId`) REFERENCES `contract_templates`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contract_modification_logs` ADD CONSTRAINT `cml_contract_fk` FOREIGN KEY (`contractId`) REFERENCES `contracts_enhanced`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contract_modification_logs` ADD CONSTRAINT `cml_modreq_fk` FOREIGN KEY (`modificationRequestId`) REFERENCES `contract_modification_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contract_modification_logs` ADD CONSTRAINT `cml_user_fk` FOREIGN KEY (`modifiedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contract_modification_requests` ADD CONSTRAINT `cmr_contract_fk` FOREIGN KEY (`contractId`) REFERENCES `contracts_enhanced`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contract_modification_requests` ADD CONSTRAINT `cmr_requested_fk` FOREIGN KEY (`requestedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contract_modification_requests` ADD CONSTRAINT `cmr_reviewed_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contract_payments` ADD CONSTRAINT `contract_payments_contractId_contracts_enhanced_id_fk` FOREIGN KEY (`contractId`) REFERENCES `contracts_enhanced`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contract_payments` ADD CONSTRAINT `contract_payments_paidBy_users_id_fk` FOREIGN KEY (`paidBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contract_templates` ADD CONSTRAINT `contract_templates_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_supplierId_suppliers_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_signatoryId_signatories_id_fk` FOREIGN KEY (`signatoryId`) REFERENCES `signatories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contracts_enhanced` ADD CONSTRAINT `contracts_enhanced_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contracts_enhanced` ADD CONSTRAINT `contracts_enhanced_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contracts_enhanced` ADD CONSTRAINT `contracts_enhanced_signatoryId_signatories_id_fk` FOREIGN KEY (`signatoryId`) REFERENCES `signatories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contracts_enhanced` ADD CONSTRAINT `contracts_enhanced_supplierId_suppliers_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contracts_enhanced` ADD CONSTRAINT `contracts_enhanced_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contracts_enhanced` ADD CONSTRAINT `contracts_enhanced_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `disbursement_orders` ADD CONSTRAINT `disbursement_orders_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `disbursement_orders` ADD CONSTRAINT `disbursement_orders_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `disbursement_orders` ADD CONSTRAINT `disbursement_orders_executedBy_users_id_fk` FOREIGN KEY (`executedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `disbursement_orders` ADD CONSTRAINT `disbursement_orders_rejectedBy_users_id_fk` FOREIGN KEY (`rejectedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `disbursement_orders` ADD CONSTRAINT `do_req_fk` FOREIGN KEY (`disbursementRequestId`) REFERENCES `disbursement_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `disbursement_requests` ADD CONSTRAINT `disbursement_requests_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `disbursement_requests` ADD CONSTRAINT `disbursement_requests_contractId_contracts_enhanced_id_fk` FOREIGN KEY (`contractId`) REFERENCES `contracts_enhanced`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `disbursement_requests` ADD CONSTRAINT `disbursement_requests_contractPaymentId_contract_payments_id_fk` FOREIGN KEY (`contractPaymentId`) REFERENCES `contract_payments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `disbursement_requests` ADD CONSTRAINT `disbursement_requests_requestedBy_users_id_fk` FOREIGN KEY (`requestedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `disbursement_requests` ADD CONSTRAINT `disbursement_requests_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `disbursement_requests` ADD CONSTRAINT `disbursement_requests_rejectedBy_users_id_fk` FOREIGN KEY (`rejectedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donation_opportunities` ADD CONSTRAINT `donation_opportunities_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donation_opportunities` ADD CONSTRAINT `donation_opportunities_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `donations` ADD CONSTRAINT `donations_opportunityId_donation_opportunities_id_fk` FOREIGN KEY (`opportunityId`) REFERENCES `donation_opportunities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `employees` ADD CONSTRAINT `employees_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `escalation_logs` ADD CONSTRAINT `escalation_logs_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `escalation_logs` ADD CONSTRAINT `escalation_logs_escalatedTo_users_id_fk` FOREIGN KEY (`escalatedTo`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `escalation_logs` ADD CONSTRAINT `escalation_logs_escalatedFrom_users_id_fk` FOREIGN KEY (`escalatedFrom`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `escalation_logs` ADD CONSTRAINT `escalation_logs_resolvedBy_users_id_fk` FOREIGN KEY (`resolvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `field_visit_reports` ADD CONSTRAINT `field_visit_reports_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `field_visit_reports` ADD CONSTRAINT `field_visit_reports_visitedBy_users_id_fk` FOREIGN KEY (`visitedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `field_visits` ADD CONSTRAINT `field_visits_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `field_visits` ADD CONSTRAINT `field_visits_assignedTo_users_id_fk` FOREIGN KEY (`assignedTo`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `field_visits` ADD CONSTRAINT `field_visits_scheduledBy_users_id_fk` FOREIGN KEY (`scheduledBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `field_visits` ADD CONSTRAINT `field_visits_executedBy_users_id_fk` FOREIGN KEY (`executedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `field_visits` ADD CONSTRAINT `field_visits_reportSubmittedBy_users_id_fk` FOREIGN KEY (`reportSubmittedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `final_reports` ADD CONSTRAINT `final_reports_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `final_reports` ADD CONSTRAINT `final_reports_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `final_reports` ADD CONSTRAINT `final_reports_preparedBy_users_id_fk` FOREIGN KEY (`preparedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `handovers` ADD CONSTRAINT `handovers_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `handovers` ADD CONSTRAINT `handovers_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `handovers` ADD CONSTRAINT `handovers_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `handovers` ADD CONSTRAINT `handovers_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `homepage_customization` ADD CONSTRAINT `homepage_customization_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mosque_images` ADD CONSTRAINT `mosque_images_mosqueId_mosques_id_fk` FOREIGN KEY (`mosqueId`) REFERENCES `mosques`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mosque_requests` ADD CONSTRAINT `mosque_requests_mosqueId_mosques_id_fk` FOREIGN KEY (`mosqueId`) REFERENCES `mosques`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mosque_requests` ADD CONSTRAINT `mosque_requests_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mosque_requests` ADD CONSTRAINT `mosque_requests_assignedTo_users_id_fk` FOREIGN KEY (`assignedTo`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mosque_requests` ADD CONSTRAINT `mosque_requests_currentResponsible_users_id_fk` FOREIGN KEY (`currentResponsible`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mosque_requests` ADD CONSTRAINT `mosque_requests_fieldVisitAssignedTo_users_id_fk` FOREIGN KEY (`fieldVisitAssignedTo`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mosques` ADD CONSTRAINT `mosques_registeredBy_users_id_fk` FOREIGN KEY (`registeredBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `mosques` ADD CONSTRAINT `mosques_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `organization_settings` ADD CONSTRAINT `organization_settings_updatedBy_users_id_fk` FOREIGN KEY (`updatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_contractId_contracts_id_fk` FOREIGN KEY (`contractId`) REFERENCES `contracts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `permissions` ADD CONSTRAINT `permissions_module_id_modules_id_fk` FOREIGN KEY (`module_id`) REFERENCES `modules`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `permissions_audit_log` ADD CONSTRAINT `permissions_audit_log_target_user_id_users_id_fk` FOREIGN KEY (`target_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `permissions_audit_log` ADD CONSTRAINT `permissions_audit_log_target_role_id_roles_id_fk` FOREIGN KEY (`target_role_id`) REFERENCES `roles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `permissions_audit_log` ADD CONSTRAINT `permissions_audit_log_permission_id_permissions_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `permissions_audit_log` ADD CONSTRAINT `permissions_audit_log_performed_by_users_id_fk` FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `progress_reports` ADD CONSTRAINT `progress_reports_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `progress_reports` ADD CONSTRAINT `progress_reports_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `progress_reports` ADD CONSTRAINT `progress_reports_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_phases` ADD CONSTRAINT `project_phases_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_managerId_users_id_fk` FOREIGN KEY (`managerId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quantity_schedules` ADD CONSTRAINT `quantity_schedules_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quantity_schedules` ADD CONSTRAINT `quantity_schedules_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quick_response_reports` ADD CONSTRAINT `quick_response_reports_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quick_response_reports` ADD CONSTRAINT `quick_response_reports_respondedBy_users_id_fk` FOREIGN KEY (`respondedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_supplierId_suppliers_id_fk` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `quotations` ADD CONSTRAINT `quotations_negotiatedBy_users_id_fk` FOREIGN KEY (`negotiatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `request_attachments` ADD CONSTRAINT `request_attachments_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `request_attachments` ADD CONSTRAINT `request_attachments_uploadedBy_users_id_fk` FOREIGN KEY (`uploadedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `request_comments` ADD CONSTRAINT `request_comments_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `request_comments` ADD CONSTRAINT `request_comments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `request_history` ADD CONSTRAINT `request_history_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `request_history` ADD CONSTRAINT `request_history_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `request_stage_tracking` ADD CONSTRAINT `request_stage_tracking_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `request_stage_tracking` ADD CONSTRAINT `request_stage_tracking_assignedTo_users_id_fk` FOREIGN KEY (`assignedTo`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `request_sub_stage_tracking` ADD CONSTRAINT `request_sub_stage_tracking_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `request_sub_stage_tracking` ADD CONSTRAINT `request_sub_stage_tracking_assignedTo_users_id_fk` FOREIGN KEY (`assignedTo`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `request_sub_stage_tracking` ADD CONSTRAINT `request_sub_stage_tracking_completedBy_users_id_fk` FOREIGN KEY (`completedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_id_permissions_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `satisfaction_surveys` ADD CONSTRAINT `satisfaction_surveys_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `satisfaction_surveys` ADD CONSTRAINT `satisfaction_surveys_requestId_mosque_requests_id_fk` FOREIGN KEY (`requestId`) REFERENCES `mosque_requests`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `satisfaction_surveys` ADD CONSTRAINT `satisfaction_surveys_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `signatories` ADD CONSTRAINT `signatories_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `suppliers` ADD CONSTRAINT `suppliers_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `survey_responses` ADD CONSTRAINT `survey_responses_surveyId_satisfaction_surveys_id_fk` FOREIGN KEY (`surveyId`) REFERENCES `satisfaction_surveys`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_permission_id_permissions_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_permissions` ADD CONSTRAINT `user_permissions_granted_by_users_id_fk` FOREIGN KEY (`granted_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_assigned_by_users_id_fk` FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;