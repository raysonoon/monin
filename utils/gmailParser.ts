import { Provider } from "../db/schema";

// Helper to run regex safely
const extract = (
  text: string,
  pattern: string,
  groupIndex: number = 1
): string | null => {
  if (!text || !pattern) return null;
  try {
    // We add 'i' flag for case-insensitive and 'm' for multiline matching
    const regex = new RegExp(pattern, "im");
    const match = text.match(regex);
    return match && match[groupIndex] ? match[groupIndex].trim() : null;
  } catch (e) {
    console.error(`Invalid Regex: ${pattern}`, e);
    return null;
  }
};

export const parseEmailWithProvider = (
  emailBody: string,
  provider: Provider
) => {
  let textToScan = emailBody;

  if (!provider.config) return;

  // Slice the Body (if markers exist)
  // This isolates the receipt area, reducing false positives from footers/headers
  const config = JSON.parse(provider.config);
  const start = emailBody.indexOf(config.bodyStartMarker);
  const end = emailBody.indexOf(config.bodyEndMarker);

  if (start !== -1 && end !== -1 && end > start) {
    textToScan = emailBody.slice(start, end);
  }

  // Extract data using stored Regex
  const rawMerchant = extract(
    textToScan,
    config.merchantRegex,
    config.merchantGroupIndex
  );
  const rawCurrency = extract(
    textToScan,
    config.amountRegex,
    config.currencyGroupIndex
  ); // Reuse amount regex for currency if they are together
  const rawAmount = extract(
    textToScan,
    config.amountRegex,
    config.amountGroupIndex
  );

  // Post-processing (Cleaning up currency & numbers)
  const currency = normalizeCurrencyCode(rawCurrency);

  const amount = rawAmount
    ? parseFloat(rawAmount.replace(/,/g, "")).toFixed(2)
    : null;

  return {
    merchant: rawMerchant || "Unknown",
    currency: currency,
    amount: amount,
  };
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

const normalizeCurrencyCode = (rawSymbol: string | null): string => {
  if (!rawSymbol) return "?"; // Default fallback
  const upperSymbol = rawSymbol.trim().toUpperCase();
  return CURRENCY_MAP[upperSymbol] || upperSymbol;
};
