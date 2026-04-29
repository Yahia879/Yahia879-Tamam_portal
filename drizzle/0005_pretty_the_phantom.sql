ALTER TABLE `field_visit_reports` ADD `mosqueCondition` varchar(100);--> statement-breakpoint
ALTER TABLE `field_visit_reports` ADD `menPrayerLength` decimal(10,2);--> statement-breakpoint
ALTER TABLE `field_visit_reports` ADD `menPrayerWidth` decimal(10,2);--> statement-breakpoint
ALTER TABLE `field_visit_reports` ADD `menPrayerHeight` decimal(10,2);--> statement-breakpoint
ALTER TABLE `field_visit_reports` ADD `womenPrayerExists` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `field_visit_reports` ADD `womenPrayerLength` decimal(10,2);--> statement-breakpoint
ALTER TABLE `field_visit_reports` ADD `womenPrayerWidth` decimal(10,2);--> statement-breakpoint
ALTER TABLE `field_visit_reports` ADD `womenPrayerHeight` decimal(10,2);--> statement-breakpoint
ALTER TABLE `field_visit_reports` ADD `requiredNeeds` text;--> statement-breakpoint
ALTER TABLE `field_visit_reports` ADD `generalDescription` text;--> statement-breakpoint
ALTER TABLE `field_visit_reports` ADD `teamMember1` varchar(255);--> statement-breakpoint
ALTER TABLE `field_visit_reports` ADD `teamMember2` varchar(255);--> statement-breakpoint
ALTER TABLE `field_visit_reports` ADD `teamMember3` varchar(255);--> statement-breakpoint
ALTER TABLE `field_visit_reports` ADD `teamMember4` varchar(255);--> statement-breakpoint
ALTER TABLE `field_visit_reports` ADD `teamMember5` varchar(255);--> statement-breakpoint
ALTER TABLE `quick_response_reports` ADD `technicalEvaluation` text;--> statement-breakpoint
ALTER TABLE `quick_response_reports` ADD `finalEvaluation` text;--> statement-breakpoint
ALTER TABLE `quick_response_reports` ADD `unexecutedWorks` text;--> statement-breakpoint
ALTER TABLE `quick_response_reports` ADD `technicianName` varchar(255);