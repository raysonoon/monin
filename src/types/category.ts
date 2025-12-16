export type Category =
  | "Food & Dining"
  | "Transport"
  | "Groceries"
  | "Shopping"
  | "Transfer"
  | "Uncategorized";

export interface CategoryRule {
  id: string;
  keyword: string; // e.g., "GENERATION HAWK"
  category: Category; // e.g., "Food & Dining"
  isUserCreated: boolean; // To distinguish between your global rules and user rules
}
