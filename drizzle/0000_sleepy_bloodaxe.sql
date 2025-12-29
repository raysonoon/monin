CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`icon` text DEFAULT '📦' NOT NULL,
	`color` text DEFAULT '#ccc' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);--> statement-breakpoint
CREATE TABLE `categorization_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`keyword` text NOT NULL,
	`match_type` text DEFAULT 'contains',
	`category_id` integer,
	`is_user_created` integer DEFAULT false,
	`created_at` integer DEFAULT (current_timestamp),
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `providers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`icon` text DEFAULT '📧' NOT NULL,
	`config` text NOT NULL
);
--> statement-breakpoint
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
	`notes` text,
	`created_at` integer DEFAULT (current_timestamp),
	FOREIGN KEY (`provider_id`) REFERENCES `providers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transactions_email_id_unique` ON `transactions` (`email_id`);