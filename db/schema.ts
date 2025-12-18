import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Categories Table (e.g., Food, Transport)
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  icon: text("icon"), // e.g., "🍔"
  color: text("color"), // e.g., "#FF0000"
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
  categoryId: integer("category_id")
    .references(() => categories.id, { onDelete: "cascade" }) // If category is deleted, delete the rule
    .notNull(),

  // Metadata
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(current_timestamp)`
  ),
});

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type CategorizationRule = typeof categorizationRules.$inferSelect;
export type NewCategorizationRule = typeof categorizationRules.$inferInsert;
