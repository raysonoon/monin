CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email_id` text NOT NULL,
	`provider_id` integer,
	`merchant` text NOT NULL,
	`amount` real NOT NULL,
	`currency` text NOT NULL,
	`date` text NOT NULL,
	`category` text NOT NULL,
	`source` text NOT NULL,
	`type` text NOT NULL,
	`created_at` integer DEFAULT (current_timestamp),
	FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transactions_email_id_unique` ON `transactions` (`email_id`);