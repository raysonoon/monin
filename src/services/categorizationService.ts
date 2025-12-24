import { db } from "../../db/client";
import { categories, categorizationRules } from "../../db/schema";
import { eq, desc, sql } from "drizzle-orm";

type InMemoryRule = {
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
   * It saves to DB and updates the cache.
   * @todo UI to add user rule, and trigger on user changing category
   */
  async addUserRule(
    merchantName: string,
    categoryId: number,
    categoryName: string
  ) {
    // Generate Keyword (Heuristic: First 2 words)
    const words = merchantName.trim().split(/\s+/);
    const keyword = words.length > 2 ? `${words[0]} ${words[1]}` : merchantName;
    const normalizedKeyword = keyword.toUpperCase();

    try {
      // Save to SQLite
      await db.insert(categorizationRules).values({
        keyword: keyword,
        categoryId: categoryId,
        matchType: "contains", // Default user-created rules to "contains" matchType
        isUserCreated: true,
      });

      // Update In-Memory Cache immediately
      // We 'unshift' so this new rule is at the start of the array (priority)
      this.rulesCache.unshift({
        keyword: normalizedKeyword,
        categoryName: categoryName,
        matchType: "contains",
      });

      console.log(`✅ Learned: "${normalizedKeyword}" is now ${categoryName}`);
    } catch (error) {
      console.error("Failed to save user rule:", error);
    }
  }
}

export const categorizationService = new CategorizationService();
