CREATE TABLE `capacity_analyses` (
	`id` varchar(64) NOT NULL,
	`assessmentId` varchar(64) NOT NULL,
	`score` int NOT NULL,
	`status` varchar(32) NOT NULL,
	`factors` json NOT NULL,
	`calculatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `capacity_analyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gis_layers` (
	`id` varchar(64) NOT NULL,
	`layerKey` varchar(128) NOT NULL,
	`title` varchar(255) NOT NULL,
	`category` varchar(64) NOT NULL,
	`geometry` json NOT NULL,
	`styleConfig` json NOT NULL,
	`dataStatus` varchar(32) NOT NULL,
	`source` varchar(255) NOT NULL,
	`observedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `gis_layers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `relocation_recommendations` (
	`id` varchar(64) NOT NULL,
	`assessmentId` varchar(64) NOT NULL,
	`score` int NOT NULL,
	`priority` varchar(32) NOT NULL,
	`recommendedAction` text NOT NULL,
	`candidateSites` json NOT NULL,
	`calculatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `relocation_recommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `risk_indicators` (
	`id` varchar(64) NOT NULL,
	`assessmentId` varchar(64) NOT NULL,
	`overallRisk` int NOT NULL,
	`riskLevel` varchar(32) NOT NULL,
	`factors` json NOT NULL,
	`methodologyVersion` varchar(255) NOT NULL,
	`dataStatus` varchar(32) NOT NULL,
	`calculatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `risk_indicators_id` PRIMARY KEY(`id`)
);
