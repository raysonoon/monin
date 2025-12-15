import { TransactionProvider } from "../../types/transaction";

export const providers: TransactionProvider[] = [
  // --- Provider 1: DBS PayLah ---
  {
    id: "dbs_paylah",
    name: "DBS PayLah!",
    gmailQuery: `subject:(Fwd: Transaction Alerts) "paylah.alert@dbs.com"`,
    parse: (email, body) => {
      // Specific regex for PayLah
      const merchantMatch = body.match(/^to:\s*([a-z0-9 .&()-]+)$/im);
      const amountMatch = body.match(/(SGD)\s?([\d,.]+)/);

      return {
        merchant: merchantMatch?.[1]?.trim() || "Unknown Merchant",
        currency: amountMatch?.[1] || "SGD",
        amount: amountMatch
          ? parseFloat(amountMatch[2].replace(",", "")).toFixed(2)
          : null,
      };
    },
  },
];
