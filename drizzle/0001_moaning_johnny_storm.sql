CREATE TABLE `assessment_areas` (
	`id` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`district` varchar(255) NOT NULL,
	`state` varchar(255) NOT NULL,
	`geometry` json NOT NULL,
	`population` int NOT NULL,
	`dataStatus` varchar(32) NOT NULL,
	`source` varchar(255) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `assessment_areas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `decision_narratives` (
	`id` varchar(64) NOT NULL,
	`assessmentId` varchar(64) NOT NULL,
	`model` varchar(128) NOT NULL,
	`label` varchar(128) NOT NULL,
	`grounding` varchar(128) NOT NULL,
	`content` json NOT NULL,
	`reviewStatus` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `decision_narratives_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `generated_reports` (
	`id` varchar(64) NOT NULL,
	`assessmentId` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`riskLevel` varchar(32) NOT NULL,
	`storageKey` varchar(1024) NOT NULL,
	`storageUrl` varchar(2048) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `generated_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `source_artifacts` (
	`id` varchar(64) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`mimeType` varchar(128) NOT NULL,
	`storageKey` varchar(1024) NOT NULL,
	`storageUrl` varchar(2048) NOT NULL,
	`uploadedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `source_artifacts_id` PRIMARY KEY(`id`)
);
