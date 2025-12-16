import { Category, CategoryRule } from "../types/category";

// Static Global Rules (Layer 1)
const GLOBAL_RULES: CategoryRule[] = [
  { id: "g1", keyword: "GRAB", category: "Transport", isUserCreated: false },
  { id: "g2", keyword: "GOJEK", category: "Transport", isUserCreated: false },
  {
    id: "g3",
    keyword: "MCDONALDS",
    category: "Food & Dining",
    isUserCreated: false,
  },
  { id: "g4", keyword: "KFC", category: "Food & Dining", isUserCreated: false },
  { id: "g5", keyword: "NTUC", category: "Groceries", isUserCreated: false },
  {
    id: "g6",
    keyword: "SHENG SIONG",
    category: "Groceries",
    isUserCreated: false,
  },
  {
    id: "g7",
    keyword: "MOBILE ENDING",
    category: "Transfer",
    isUserCreated: false,
  }, // Default for PayLah P2P
];

// Fetch User Rules (Layer 2) - Mock implementation
// In reality, fetch this from your DB/Storage
let userRules: CategoryRule[] = [];

export const categorizeMerchant = (merchantRaw: string): Category => {
  const normalizedMerchant = merchantRaw.toUpperCase();

  // Step A: Check User Rules FIRST (They override global rules)
  const userMatch = userRules.find((rule) =>
    normalizedMerchant.includes(rule.keyword.toUpperCase()),
  );
  if (userMatch) return userMatch.category;

  // Step B: Check Global Rules
  const globalMatch = GLOBAL_RULES.find((rule) =>
    normalizedMerchant.includes(rule.keyword.toUpperCase()),
  );
  if (globalMatch) return globalMatch.category;

  // Step C: Fallback
  return "Uncategorized";
};

// The "Learn" Function
export const addUserRule = (merchantName: string, category: Category) => {
  // Simple heuristic: Create a rule based on the first 2 words
  // or the whole string if it's short.
  // "GENERATION HAWK 2 PTE LTD" -> Keyword: "GENERATION HAWK"
  const words = merchantName.split(" ");
  const keyword = words.length > 2 ? `${words[0]} ${words[1]}` : merchantName;

  const newRule: CategoryRule = {
    id: Date.now().toString(),
    keyword: keyword,
    category,
    isUserCreated: true,
  };

  userRules.push(newRule);
  // TODO: Save 'userRules' to persistent storage
  console.log(`Learned: "${keyword}" is now ${category}`);
};
