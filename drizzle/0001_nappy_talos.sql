ALTER TABLE `transactions` ADD `base_currency` text DEFAULT 'SGD' NOT NULL;--> statement-breakpoint
ALTER TABLE `transactions` ADD `base_amount` real;--> statement-breakpoint
ALTER TABLE `transactions` ADD `fx_rate` real;--> statement-breakpoint
ALTER TABLE `transactions` ADD `fx_date` text;