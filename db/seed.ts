import { db } from "./client";
import { categories, categorizationRules } from "./schema";

// Define your default Categories (Name, Icon, Color)
const DEFAULT_CATEGORIES = [
  { name: "Food & Dining", icon: "🍔", color: "#FF5733" },
  { name: "Transport", icon: "🚕", color: "#3498DB" },
  { name: "Groceries", icon: "🛒", color: "#2ECC71" },
  { name: "Shopping", icon: "🛍️", color: "#9B59B6" },
  { name: "Bills", icon: "📄", color: "#E74C3C" },
  { name: "Transfers", icon: "💸", color: "#95A5A6" },
];

// Define your Rules (Keyword -> Category Name mapping)
// We use the Category Name here to look up the ID later
const GLOBAL_RULES_DATA = [
  // Specific rules
  { keyword: "GrabFood", category: "Food & Dining", matchType: "contains" },
  { keyword: "GrabCar", category: "Transport", matchType: "contains" },
  { keyword: "GrabHitch", category: "Transport", matchType: "contains" },

  // Transport
  { keyword: "Grab", category: "Transport", matchType: "contains" }, // Generic fallback
  { keyword: "Gojek", category: "Transport", matchType: "contains" },
  { keyword: "CDG Taxi", category: "Transport", matchType: "contains" },
  { keyword: "SimplyGo", category: "Transport", matchType: "contains" }, // Bus/Train

  // Food
  { keyword: "McDonalds", category: "Food & Dining", matchType: "contains" },
  { keyword: "KFC", category: "Food & Dining", matchType: "contains" },
  { keyword: "Starbucks", category: "Food & Dining", matchType: "contains" },
  { keyword: "Foodpanda", category: "Food & Dining", matchType: "contains" },
  { keyword: "Deliveroo", category: "Food & Dining", matchType: "contains" },

  // Groceries
  { keyword: "NTUC", category: "Groceries", matchType: "contains" },
  { keyword: "Sheng Siong", category: "Groceries", matchType: "contains" },
  { keyword: "Cold Storage", category: "Groceries", matchType: "contains" },
  { keyword: "Giant", category: "Groceries", matchType: "contains" },

  // Shopping
  { keyword: "Shopee", category: "Shopping", matchType: "contains" },
  { keyword: "Lazada", category: "Shopping", matchType: "contains" },
  { keyword: "Amazon", category: "Shopping", matchType: "contains" },
  { keyword: "Uniqlo", category: "Shopping", matchType: "contains" },

  // Entertainment
  { keyword: "Netflix", category: "Entertainment", matchType: "exact" },

  // Transfers
  { keyword: "Mobile ending", category: "Transfers", matchType: "contains" },
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
        isUserCreated: false, // False for global rules
      };
    }).filter((r) => r !== null); // Remove any nulls if categories were missing

    // Insert Rules
    if (rulesToInsert.length > 0) {
      await db.insert(categorizationRules).values(rulesToInsert);
      console.log(`Inserted ${rulesToInsert.length} categorization rules.`);
    }

    console.log("✅ Seeding complete!");
  } catch (e) {
    console.error("❌ Error seeding database:", e);
  }
};
