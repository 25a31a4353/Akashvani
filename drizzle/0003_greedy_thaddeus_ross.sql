CREATE TABLE `historical_case_studies` (
	`id` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`location` varchar(255) NOT NULL,
	`hazardType` varchar(96) NOT NULL,
	`eventDate` varchar(32) NOT NULL,
	`description` text NOT NULL,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `historical_case_studies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `historical_datasets` (
	`id` varchar(64) NOT NULL,
	`caseStudyId` varchar(64) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`version` int NOT NULL,
	`phase` varchar(32) NOT NULL,
	`format` varchar(32) NOT NULL,
	`sourceType` varchar(64) NOT NULL,
	`sourceUrl` varchar(2048),
	`description` text,
	`license` varchar(512),
	`dateAcquired` varchar(32),
	`storageKey` varchar(1024) NOT NULL,
	`storageUrl` varchar(2048) NOT NULL,
	`spatialCoverage` varchar(255),
	`timeRange` varchar(255),
	`schema` json NOT NULL,
	`mapping` json NOT NULL,
	`validation` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `historical_datasets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `historical_reports` (
	`id` varchar(64) NOT NULL,
	`caseStudyId` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`storageKey` varchar(1024) NOT NULL,
	`storageUrl` varchar(2048) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `historical_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `historical_runs` (
	`id` varchar(64) NOT NULL,
	`caseStudyId` varchar(64) NOT NULL,
	`parameters` json NOT NULL,
	`prediction` json NOT NULL,
	`comparison` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `historical_runs_id` PRIMARY KEY(`id`)
);
