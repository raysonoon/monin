import type { GmailMessage } from "./gmail";

export interface Transaction {
  source: string;
  merchant: string | undefined;
  amount: string | null; // 2dp string
  currency: string | undefined;
  date: string; // ISO string
  category?: string;
  emailId: string;
}

export interface TransactionProvider {
  id: string;
  name: string;
  gmailQuery: string;
  // The logic to extract data from the raw email body/subject
  parse: (email: GmailMessage, body: string) => Partial<Transaction>;
}
