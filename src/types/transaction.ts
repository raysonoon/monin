import type { GmailMessage } from "./gmail";
import type { Category } from "./category";

export type TransactionType = "income" | "expense";

export interface Transaction {
  emailId: string;
  providerId?: number;
  merchant: string | null;
  amount: number | null;
  currency: string | undefined;
  date: string; // ISO string
  category: Category;
  source: string;
  type: TransactionType;
  notes?: string;
}

export interface TransactionProvider {
  id: string;
  name: string;
  gmailQuery: string;
  // The logic to extract data from the raw email body/subject
  parse: (email: GmailMessage, body: string) => Partial<Transaction>;
}
