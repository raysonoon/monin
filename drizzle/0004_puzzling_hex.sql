CREATE TABLE `wallets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`icon` text DEFAULT '👝' NOT NULL,
	`type` text DEFAULT 'cashless' NOT NULL,
	`opening_balance` real NOT NULL,
	`opening_balance_date` text NOT NULL,
	`currency` text NOT NULL,
	`created_at` integer DEFAULT (current_timestamp)
);
--> statement-breakpoint
ALTER TABLE `transactions` ADD `wallet_id` integer REFERENCES wallets(id);