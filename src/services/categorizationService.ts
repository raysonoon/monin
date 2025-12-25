import { db } from "../../db/client";
import { categories, categorizationRules } from "../../db/schema";
import { eq, desc, sql } from "drizzle-orm";

type InMemoryRule = {
  id: number;
  keyword: string;
  categoryName: string;
  matchType: "contains" | "exact" | "starts_with";
};

class CategorizationService {
  private rulesCache: InMemoryRule[] = [];
  private isInitialized = false;

  async init() {
    if (this.isInitialized) return;

    const result = await db
      .select({
        id: categorizationRules.id,
        keyword: categorizationRules.keyword,
        matchType: categorizationRules.matchType,
        categoryName: categories.name,
      })
      .from(categorizationRules)
      .innerJoin(categories, eq(categorizationRules.categoryId, categories.id))
      // PRIORITY 1: User-created rules override global rules
      // PRIORITY 2: Longest keywords first (Specificity)
      .orderBy(
        desc(categorizationRules.isUserCreated),
        sql`length(${categorizationRules.keyword}) DESC`
      );

    this.rulesCache = result as InMemoryRule[];
    this.isInitialized = true;
  }

  categorizeMerchant(rawMerchant: string): string {
    if (!this.isInitialized) return "Uncategorized";
    const normalizedMerchant = rawMerchant.toUpperCase();

    const match = this.rulesCache.find((rule) => {
      const ruleKey = rule.keyword.toUpperCase();

      switch (rule.matchType) {
        case "exact":
          return normalizedMerchant === ruleKey;

        case "starts_with":
          return normalizedMerchant.startsWith(ruleKey);

        case "contains":
        default:
          return normalizedMerchant.includes(ruleKey);
      }
    });

    console.log(
      `For merchant ${normalizedMerchant}, category ${match?.categoryName}`
    );
    return match ? match.categoryName : "Uncategorized";
  }

  /**
   * PERSISTENCE: This replaces the old array.push logic.
   * It saves new user rule to DB and updates the cache.
   */
  async addUserRule(
    merchantName: string,
    categoryId: number,
    categoryName: string
  ) {
    const keyword = merchantName;
    const normalizedKeyword = keyword.toUpperCase();

    try {
      // Save to SQLite and capture returned ID
      const [newRule] = await db
        .insert(categorizationRules)
        .values({
          keyword: keyword,
          categoryId: categoryId,
          matchType: "contains", // Default user-created rules to "contains" matchType
          isUserCreated: true,
        })
        .returning({ insertedId: categorizationRules.id });

      // Update In-Memory Cache immediately
      // We 'unshift' so this new rule is at the start of the array (priority)
      this.rulesCache.unshift({
        id: newRule.insertedId,
        keyword: normalizedKeyword,
        categoryName: categoryName,
        matchType: "contains",
      });

      console.log(
        `✅ Learned: "${normalizedKeyword}" (ID: ${newRule.insertedId}) is now ${categoryName}`
      );
    } catch (error) {
      console.error("Failed to save user rule:", error);
    }
  }

  async editUserRule(
    id: number,
    merchantName: string,
    categoryId: number,
    categoryName: string
  ) {
    try {
      // Update SQLite DB
      await db
        .update(categorizationRules)
        .set({
          keyword: merchantName,
          categoryId: categoryId,
        })
        .where(eq(categorizationRules.id, id));

      // Update Cache
      const index = this.rulesCache.findIndex((r) => r.id === id);
      if (index !== -1) {
        this.rulesCache[index] = {
          ...this.rulesCache[index],
          keyword: merchantName,
          categoryName: categoryName,
        };

        // To add re-sort if merchant name/keyword length changed significantly
      }
      console.log(`✅ Updated rule: ${merchantName}`);
    } catch (error) {
      console.error("Failed to edit user rule:", error);
      throw error;
    }
  }

  async deleteUserRule(id: number) {
    try {
      // Delete from SQLite
      await db
        .delete(categorizationRules)
        .where(eq(categorizationRules.id, id));

      // Remove from Cache
      this.rulesCache = this.rulesCache.filter((r) => r.id !== id);

      console.log(`🗑️ Deleted rule ID: ${id}`);
    } catch (error) {
      console.error("Failed to delete user rule:", error);
      throw error;
    }
  }
}

export const categorizationService = new CategorizationService();
