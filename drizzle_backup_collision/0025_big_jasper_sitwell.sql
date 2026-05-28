ALTER TABLE `mosques` ADD `governorate` varchar(100);--> statement-breakpoint
ALTER TABLE `mosques` ADD `center` varchar(100);--> statement-breakpoint
ALTER TABLE `mosques` ADD `hasPrayerHall` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `mosques` ADD `mosqueAge` int;--> statement-breakpoint
ALTER TABLE `mosques` DROP COLUMN `status`;--> statement-breakpoint
ALTER TABLE `mosques` DROP COLUMN `ownership`;