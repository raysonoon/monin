import { db } from "./client";
import { categories, categorizationRules } from "./schema";

// 1. Define your default Categories (Name, Icon, Color)
const DEFAULT_CATEGORIES = [
  { name: "Food & Dining", icon: "🍔", color: "#FF5733" },
  { name: "Transport", icon: "🚕", color: "#3498DB" },
  { name: "Groceries", icon: "🛒", color: "#2ECC71" },
  { name: "Shopping", icon: "🛍️", color: "#9B59B6" },
  { name: "Bills", icon: "📄", color: "#E74C3C" },
  { name: "Transfers", icon: "💸", color: "#95A5A6" },
];

// 2. Define your Rules (Keyword -> Category Name mapping)
// We use the Category Name here to look up the ID later
const GLOBAL_RULES_DATA = [
  // Transport
  { keyword: "GRAB", category: "Transport" },
  { keyword: "GOJEK", category: "Transport" },
  { keyword: "CDG TAXI", category: "Transport" },
  { keyword: "SIMPLYGO", category: "Transport" }, // Bus/Train

  // Food
  { keyword: "MCDONALDS", category: "Food & Dining" },
  { keyword: "KFC", category: "Food & Dining" },
  { keyword: "STARBUCKS", category: "Food & Dining" },
  { keyword: "FOODPANDA", category: "Food & Dining" },
  { keyword: "DELIVEROO", category: "Food & Dining" },

  // Groceries
  { keyword: "NTUC", category: "Groceries" },
  { keyword: "SHENG SIONG", category: "Groceries" },
  { keyword: "COLD STORAGE", category: "Groceries" },
  { keyword: "GIANT", category: "Groceries" },

  // Shopping
  { keyword: "SHOPEE", category: "Shopping" },
  { keyword: "LAZADA", category: "Shopping" },
  { keyword: "AMAZON", category: "Shopping" },
  { keyword: "UNIQLO", category: "Shopping" },

  // Transfers
  { keyword: "PAYNOW", category: "Transfers" },
  { keyword: "PAYLAH", category: "Transfers" },
];

export const seedDatabase = async () => {
  try {
    console.log("🌱 Checking database state...");

    // Check if data already exists to prevent duplicates
    const existing = await db.select().from(categories).limit(1);
    if (existing.length > 0) {
      console.log("✅ Database already seeded. Skipping.");
      return;
    }

    console.log("🌱 Database empty. Starting seed...");

    // Insert Categories and capture their generated IDs
    const insertedCategories = await db
      .insert(categories)
      .values(DEFAULT_CATEGORIES)
      .returning(); // <--- Critical: Returns the rows with their new IDs

    console.log(`Inserted ${insertedCategories.length} categories.`);

    // Create a Lookup Map: "Transport" -> ID 1
    const categoryMap = new Map(
      insertedCategories.map((cat) => [cat.name, cat.id])
    );

    // Prepare Rules Data
    const rulesToInsert = GLOBAL_RULES_DATA.map((rule) => {
      const catId = categoryMap.get(rule.category);

      if (!catId) {
        console.warn(
          `⚠️ Warning: No category found for rule "${rule.keyword}"`
        );
        return null;
      }

      return {
        keyword: rule.keyword,
        categoryId: catId,
        matchType: "contains" as const, // Defaulting to your schema's enum
      };
    }).filter((r) => r !== null); // Remove any nulls if categories were missing

    // Insert Rules
    if (rulesToInsert.length > 0) {
      // @ts-ignore - Typescript might complain about nulls despite filter, ignore safe here
      await db.insert(categorizationRules).values(rulesToInsert);
      console.log(`Inserted ${rulesToInsert.length} categorization rules.`);
    }

    console.log("✅ Seeding complete!");
  } catch (e) {
    console.error("❌ Error seeding database:", e);
  }
};
