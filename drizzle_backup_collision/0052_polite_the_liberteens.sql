CREATE TABLE `project_number_sequence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`year` int NOT NULL,
	`lastSequence` int NOT NULL DEFAULT 0,
	`updatedAt` datetime NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `project_number_sequence_id` PRIMARY KEY(`id`),
	CONSTRAINT `project_number_sequence_year_unique` UNIQUE(`year`)
);
