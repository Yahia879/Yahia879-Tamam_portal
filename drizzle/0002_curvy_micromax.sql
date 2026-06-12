CREATE TABLE `notification_trigger_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`triggerId` varchar(100) NOT NULL,
	`roleId` varchar(50) NOT NULL,
	`channel` varchar(50) NOT NULL,
	`enabled` boolean NOT NULL DEFAULT false,
	CONSTRAINT `notification_trigger_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_trigger_role_channel` UNIQUE(`triggerId`,`roleId`,`channel`)
);
