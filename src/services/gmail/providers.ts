import { TransactionProvider } from "../../types/transaction";

export const providers: TransactionProvider[] = [
  // --- Provider 1: DBS PayLah ---
  {
    id: "dbs_paylah",
    name: "DBS PayLah!",
    gmailQuery: `subject:(Transaction Alerts) "paylah.alert@dbs.com"`,
    parse: (email, body) => {
      // Slice transaction body
      const start = body.indexOf("Transaction Ref:");
      const end = body.indexOf("To view your transactions");

      const txnBody =
        start !== -1 && end !== -1 ? body.slice(start, end) : null;
      console.log("Transaction body:", txnBody);
      // Specific regex for PayLah
      const merchantMatch = txnBody?.match(/^to:\s*([a-z0-9 .&()-]+)$/im);
      console.log("merchantMatch:", merchantMatch);
      const amountMatch = txnBody?.match(/(SGD)\s?([\d,.]+)/);
      console.log("amountMatch:", amountMatch);

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
