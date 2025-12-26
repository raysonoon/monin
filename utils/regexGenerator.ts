export interface ExtractionState {
  merchant: string;
  amount: string;
  currency: string;
  merchantRegex: string;
  amountRegex: string;
  hints: {
    merchant?: string;
    amount?: string;
  };
}

export function generateAutoConfigs(transactionBlock: string): ExtractionState {
  const escapeRegExp = (str: string) =>
    str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const block = normalizeText(transactionBlock);
  console.log("Normalized transaction block:", block);

  const lines = block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const result: ExtractionState = {
    merchant: "",
    amount: "",
    currency: "?",
    merchantRegex: "",
    amountRegex: "",
    hints: {},
  };

  if (lines.length === 0) return result;

  // --- 1. MERCHANT HEURISTIC (Sentence-based & Stacked) ---
  const merchantMatch = block.match(
    /(?:Merchant|To|Paid\s+to|purchase\s+on|payment\s+to)[:\s]*([^.\n:]+)/i
  );

  if (merchantMatch) {
    result.merchant = merchantMatch[1].trim();
    // Anchor matches the text before the name (e.g., "made a purchase on ")
    const anchor = merchantMatch[0].split(result.merchant)[0];
    result.merchantRegex = `${escapeRegExp(anchor)}([^.\\n:]+)`;
  } else if (lines.length > 0) {
    // Fallback: Use the first line
    result.merchant = lines[0];
    result.merchantRegex = `^(.+)$`;
  }

  // --- 2. AMOUNT HEURISTIC (Handles S$, SGD, and $) ---
  // Updated pattern to include S\$ and allow amounts with or without decimals
  const moneyPattern = /(S\$|[A-Z]{3}|\$)?\s?([\d,]+(?:\.\d{1,2})?)/;

  // Look for amount keywords followed by the money pattern
  const amountMatch = block.match(
    new RegExp(
      `(?:Amount|Total|Sum|Sent|Paid)[:\\s]*${moneyPattern.source}`,
      "i"
    )
  );

  if (amountMatch) {
    result.currency = normalizeCurrencyCode(amountMatch[1]);
    result.amount = parseFloat(amountMatch[2].replace(/,/g, "")).toFixed(2);

    // Find the line containing the amount to build the anchor
    const fullLine = lines.find((l) => l.includes(amountMatch[0].trim())) || "";
    const anchor = fullLine.split(amountMatch[1] || amountMatch[2])[0];

    // Pattern captures currency/symbol in Group 1 and digits in Group 2
    result.amountRegex = `^${escapeRegExp(anchor)}(S\\$|[A-Z]{3}|\\$)?\\s?([\\d,.]+)$`;
  }

  // --- HINTS ---
  if (!result.merchant)
    result.hints.merchant = "Ensure the merchant name is the first line.";
  if (!result.amount)
    result.hints.amount = "Include the line showing the total amount";

  return result;
}

export function generateSlicingMarkers(
  fullBody: string,
  transactionBlock: string
) {
  // Normalize newlines to avoid issues with different OS line endings
  // const body = fullBody.replace(/\r\n/g, "\n");
  // const block = transactionBlock.replace(/\r\n/g, "\n").trim();
  const body = normalizeText(fullBody);
  const block = normalizeText(transactionBlock);

  const startIndex = body.indexOf(block);

  if (startIndex === -1) {
    throw new Error("Transaction block not found in email body");
  }

  // Find Start Marker (look at the line immediately preceding the block)
  // We take the last non-empty line before the block starts
  const preBlock = body.substring(0, startIndex).trimEnd();
  const lastNewLine = preBlock.lastIndexOf("\n");
  const startMarker = preBlock.substring(lastNewLine + 1).trim();

  // Find End Marker (look at the line immediately following the block)
  const endIndex = startIndex + block.length;
  const postBlock = body.substring(endIndex).trimStart();
  const firstNewLine = postBlock.indexOf("\n");
  const endMarker = postBlock.substring(0, firstNewLine).trim();

  return {
    bodyStartMarker: startMarker, // e.g., "Transaction Details:"
    bodyEndMarker: endMarker, // e.g., "Thank you for banking with us"
  };
}

// Normalize text for easier regex
const normalizeText = (text: string): string => {
  return text
    .replace(/\r\n/g, "\n") // Windows line break --> Unix line break
    .replace(/\n+/g, "\n") // Multiple newlines into one
    .trim(); // Remove leading, trailing spaces
};

// Helper functions to standardise currency extraction
const CURRENCY_MAP: Record<string, string> = {
  S$: "SGD",
  $: "?", // Unknown currency
  SGD: "SGD",
  US$: "USD",
  USD: "USD",
  "€": "EUR",
  "£": "GBP",
};

const normalizeCurrencyCode = (rawSymbol: string | undefined): string => {
  if (!rawSymbol) return "?"; // Default fallback
  const upperSymbol = rawSymbol.trim().toUpperCase();
  return CURRENCY_MAP[upperSymbol] || upperSymbol;
};
