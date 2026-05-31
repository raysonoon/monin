PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email_id` text NOT NULL,
	`provider_id` integer,
	`merchant` text NOT NULL,
	`amount` real NOT NULL,
	`currency` text NOT NULL,
	`date` text NOT NULL,
	`base_currency` text DEFAULT 'SGD' NOT NULL,
	`base_amount` real NOT NULL,
	`fx_rate` real,
	`fx_date` text,
	`category` text NOT NULL,
	`source` text NOT NULL,
	`type` text DEFAULT 'expense' NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (current_timestamp),
	FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_transactions`("id", "email_id", "provider_id", "merchant", "amount", "currency", "date", "base_currency", "base_amount", "fx_rate", "fx_date", "category", "source", "type", "notes", "created_at") SELECT "id", "email_id", "provider_id", "merchant", "amount", "currency", "date", "base_currency", "base_amount", "fx_rate", "fx_date", "category", "source", "type", "notes", "created_at" FROM `transactions`;--> statement-breakpoint
DROP TABLE `transactions`;--> statement-breakpoint
ALTER TABLE `__new_transactions` RENAME TO `transactions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `transactions_email_id_unique` ON `transactions` (`email_id`);--> statement-breakpoint
ALTER TABLE `providers` ADD `type` text DEFAULT 'expense' NOT NULL;