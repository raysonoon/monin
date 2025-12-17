## Categories table
```ts
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  icon: text("icon"), // e.g., "🍔"
  color: text("color"), // e.g., "#FF0000"
});
```

```sql
CREATE TABLE `categories` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `name` TEXT NOT NULL,
  `icon` TEXT,
  `color` TEXT
);
```

- `PRIMARY KEY AUTOINCREMENT`: ensures every category gets a unique ID (1, 2, 3)
- `name` field is mandatory (`NOT NUll`)
- `icon` and `color` are optional fields --> `DEFAULT NULL`

## Categorization rules table
```ts
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
  createdAt: integer("created_at", { mode: "timestamp" }).defaultNow(),
});
```

```sql
CREATE TABLE `categorization_rules` (
  `id` INTEGER PRIMARY KEY AUTOINCREMENT,
  `keyword` TEXT NOT NULL,
  `match_type` TEXT DEFAULT 'contains' CHECK (`match_type` IN ('contains', 'exact', 'starts_with')),
  `category_id` INTEGER NOT NULL,
  `created_at` INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE
);
```

- `keyword`: "search term" to look for
- `match_type`: how strict should search be e.g. `contains`, `exact`, `starts_with`
- `category-id`: integer ID of category the transaction belongs to
- `REFERENCES` ensures a rule cannot be added for a non-existent `category_id`
- `ON DELETE CASCADE` automatically delete all rules associated with `category_id` if that associated category is deleted