import { sql } from "drizzle-orm";
import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";
import { TransactionType } from "../src/types/transaction";

// Providers Table (Customizable providers for transaction parsing)
export const providers = sqliteTable("providers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon").notNull().default("📧"), // Default icon for providers
  config: text("config").notNull(), // stores defaultConfig
});

// Categories Table (e.g., Food, Transport)
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  icon: text("icon").notNull().default("📦"), // e.g., "🍔"
  color: text("color").notNull().default("#ccc"), // e.g., "#FF0000"
});

// Rules Table (The "Brain" of your categorization)
export const categorizationRules = sqliteTable("categorization_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  // The pattern to look for (e.g., "GRAB", "MCDONALDS")
  keyword: text("keyword").notNull(),

  // How to match? (Contains, StartsWith, Exact)
  // Useful if you want "Uber" to match "UberEats" but not "Uber Technologies"
  matchType: text("match_type", {
    enum: ["contains", "exact", "starts_with"],
  }).default("contains"),

  // Foreign Key: Which category applies?
  categoryId: integer("category_id").references(() => categories.id, {
    onDelete: "cascade",
  }), // If category is deleted, delete the rule

  // To separate user and global rules
  isUserCreated: integer("is_user_created", { mode: "boolean" }).default(false),

  // Metadata
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(current_timestamp)`
  ),
});

// Transactions Table
export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  emailId: text("email_id").notNull().unique(), // Unique Gmail Message ID
  providerId: integer("provider_id").references(() => providers.id, {
    onDelete: "cascade",
  }),

  // Data extracted
  merchant: text("merchant").notNull(),
  amount: real("amount").notNull(),
  currency: text("currency").notNull(),
  date: text("date").notNull(),

  // Categorization
  category: text("category").notNull(),
  source: text("source").notNull(),

  type: text("type").$type<TransactionType>().notNull(),
  notes: text("notes"),

  // Metadata
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(current_timestamp)`
  ),
});

export type Provider = typeof providers.$inferSelect;
export type NewProvider = typeof providers.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type CategorizationRule = typeof categorizationRules.$inferSelect;
export type NewCategorizationRule = typeof categorizationRules.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
