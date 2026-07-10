CREATE TABLE `threat_scan_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`timestamp` text NOT NULL,
	`source` text NOT NULL,
	`pattern_preview` text,
	`threats` text,
	`action` text NOT NULL,
	`agent` text,
	`project` text
);--> statement-breakpoint
CREATE INDEX `idx_threat_scan_timestamp` ON `threat_scan_log` (`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_threat_scan_source` ON `threat_scan_log` (`source`);
