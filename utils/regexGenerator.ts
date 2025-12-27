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

  // --- 1. MERCHANT HEURISTIC IMPROVED ---
  const merchantMatch = block.match(
    /(?:Merchant|To|Paid\s+to|purchase\s+on|payment\s+to)[:\s]+([^.\n:]+)/i
  );

  if (merchantMatch) {
    result.merchant = merchantMatch[1].trim();
    // Instead of a strict newline, use \s+ which handles spaces AND newlines
    const rawAnchor = merchantMatch[0].split(result.merchant)[0];
    // We allow flexible whitespace \s* in the generated regex
    result.merchantRegex = `${escapeRegExp(rawAnchor).replace(/\s+/g, "\\s+")}([^.\\n:]+)`;
  }

  // --- 2. AMOUNT HEURISTIC IMPROVED ---
  // Simplified pattern: Group 1 = Currency, Group 2 = Number
  const moneyPattern = /(S\$|[A-Z]{3}|\$)?\s*([\d,]+\.?\d*)/;

  const amountMatch = block.match(
    new RegExp(
      `(?:Amount|Total|Sum|Sent|Paid)[:\\s]+${moneyPattern.source}`,
      "i"
    )
  );

  if (amountMatch) {
    result.currency = normalizeCurrencyCode(amountMatch[1]);
    result.amount = amountMatch[2].replace(/,/g, "");

    // Locate the specific line to build a contextual anchor
    const anchorLine =
      lines.find((l) => l.includes(amountMatch[0].trim())) || amountMatch[0];
    const anchorPart = anchorLine.split(amountMatch[1] || amountMatch[2])[0];

    // REMOVE the ^ and $ anchors. They are too strict for email parsing.
    // We use \s* to handle any spacing between currency and amount.
    result.amountRegex = `${escapeRegExp(anchorPart).replace(/\s+/g, "\\s+")}(S\\$|[A-Z]{3}|\\$)?\\s*([\\d,.]+)`;
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
  // Normalize both to ensure exact matching
  const body = normalizeText(fullBody);
  const bodyLines = body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  console.log("body lines", bodyLines);
  const block = normalizeText(transactionBlock);
  const blockLines = block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  console.log("block lines", blockLines);
  if (blockLines.length === 0 || bodyLines.length === 0) {
    throw new Error("Cannot generate markers from empty text.");
  }

  // Find where the blockLines sequence starts in the bodyLines array
  let startIndex = -1;

  // Iterate through the body lines to find the sequence match
  for (let i = 0; i <= bodyLines.length - blockLines.length; i++) {
    // Check if the sequence of lines matches exactly
    let matchFound = true;
    for (let j = 0; j < blockLines.length; j++) {
      if (bodyLines[i + j] !== blockLines[j]) {
        matchFound = false;
        break;
      }
    }

    if (matchFound) {
      startIndex = i;
      break;
    }
  }

  console.log(`Match Result: startIndex = ${startIndex}`);

  if (startIndex === -1) {
    // Fallback: If exact line match fails, strict string match failed too.
    // Usually means user edited the text.
    console.warn("Could not find exact block lines in body.");
    return { bodyStartMarker: "", bodyEndMarker: "" };
  }

  // --- START MARKER ---
  // Try to get the line before the block.
  // Fallback: If block starts at index 0, use the first line of the block itself.
  const rawStartMarker =
    startIndex > 0 ? bodyLines[startIndex - 1] : bodyLines[0];
  const startMarker = getStaticMarker(rawStartMarker);

  // --- END MARKER ---
  // Try to get the line after the block.
  // Fallback: If block reaches the very end, use the last line of the block itself.
  const endIndex = startIndex + blockLines.length;
  const rawEndMarker =
    endIndex < bodyLines.length
      ? bodyLines[endIndex]
      : bodyLines[bodyLines.length - 1];
  const endMarker = getStaticMarker(rawEndMarker);

  console.log("Markers Found:", { startMarker, endMarker });

  return {
    bodyStartMarker: startMarker,
    bodyEndMarker: endMarker,
  };
}

// Normalize text for easier regex
const normalizeText = (text: string): string => {
  return text
    .replace(/\r\n/g, "\n") // Windows line break --> Unix line break
    .replace(/\n+/g, "\n") // Multiple newlines into one
    .trim(); // Remove leading, trailing spaces
};

// Helper function to find static markers
const getStaticMarker = (text: string): string => {
  if (!text) return "";
  // Split by full stop to avoid capturing trailing data in a sentence
  const firstSentence = text.split(".")[0];
  // Split by whitespace and take first 3 words
  const words = firstSentence.trim().split(/\s+/).slice(0, 2);
  return words.join(" ");
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
