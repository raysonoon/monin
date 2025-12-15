export interface Transaction {
  source: "gmail";
  merchant: string | undefined;
  amount: string | null; // 2dp string
  currency: string | undefined;
  date: string; // ISO string
  category?: string;
  emailId: string;
}
