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
        merchant: merchantMatch?.[1]?.trim() || "Unknown",
        currency: amountMatch?.[1] || "SGD",
        amount: amountMatch
          ? parseFloat(amountMatch[2].replace(",", "")).toFixed(2)
          : null,
      };
    },
  },

  // --- Provider 2: YouTrip ---
  {
    id: "youtrip",
    name: "YouTrip",
    gmailQuery: `subject:online purchases "noreply@you.co"`,
    parse: (email, body) => {
      // Slice transaction body
      const txnBody = sliceYouTripTransactions(body);
      console.log("Sliced transaction body:", txnBody);

      const txnMatch = txnBody?.match(/^(.+)\s+([A-Z]{3})\s+([\d,.]+)/im);
      console.log("Transaction matches:", txnMatch);

      if (!txnMatch) {
        return {
          merchant: "Unknown",
          currency: "SGD",
          amount: null,
        };
      }

      // Match Group 1: Merchant (e.g., IMMIGRATION CANADA ONL~365 LAURIER AVE~...)
      const merchant = txnMatch[1].trim();

      // Match Group 2: Currency (e.g., SGD)
      const currency = txnMatch[2];

      // Match Group 3: Amount (e.g., 6.58 or 1022.19)
      const rawAmount = txnMatch[3];
      const amount = parseFloat(rawAmount.replace(",", "")).toFixed(2);

      return {
        merchant: merchant,
        currency: currency,
        amount: amount,
      };
    },
  },
];

/**
 * Slices the transaction block from the full email body.
 * @param body The normalized, decoded email body string.
 * @returns The raw text block containing only the transactions, or null.
 */
const sliceYouTripTransactions = (body: string): string | null => {
  // Matches: "Time (UTC+8)" followed by any characters/whitespace until the transaction block.
  // We use a non-greedy match (.*?) to find the first occurrence.
  const startPattern = /Time\s*\(UTC\+8\)\s*(\.|)\n*(.*?)/i;

  const startMatch = body.match(startPattern);

  if (!startMatch || startMatch.index === undefined) {
    console.warn("Could not find YouTrip start marker: Time (UTC+8)");
    return null;
  }

  // The transaction block starts immediately after the match
  const startIndex = startMatch.index + startMatch[0].length;

  // Matches: "full transaction history"
  // This is the common end-of-transactions marker before the closing links/buttons.
  const endPattern = /full transaction history/i;

  const endMatch = body.match(endPattern);

  if (!endMatch || endMatch.index === undefined) {
    console.warn("Could not find YouTrip end marker: full transaction history");
    return null;
  }

  // The transaction block ends right before the match
  const endIndex = endMatch.index;

  // Perform the Slice
  if (startIndex < endIndex) {
    // Slice the content between the two anchors and trim whitespace
    return body.slice(startIndex, endIndex).trim();
  }

  return null;
};
