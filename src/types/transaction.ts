export interface Transaction {
  source: "gmail";
  merchant: string;
  amount: number;
  currency: string;
  date: string; // ISO
  category?: string;
  emailId: string;
}
