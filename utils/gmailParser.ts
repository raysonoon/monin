import { Provider } from "../db/schema";
import type { GmailHeader } from "../src/types/gmail";

type ResolveDateInput = {
  rawDate: string | null;
  rawTime: string | null;
  rawTimezone: string | null;
  headerDate?: string;
};

const MONTHS: Record<string, number> = {
  JAN: 0,
  FEB: 1,
  MAR: 2,
  APR: 3,
  MAY: 4,
  JUN: 5,
  JUL: 6,
  AUG: 7,
  SEP: 8,
  OCT: 9,
  NOV: 10,
  DEC: 11,
};

const TIMEZONE_OFFSETS: Record<string, number> = {
  UTC: 0,
  GMT: 0,
  SGT: 8 * 60,
  SST: 8 * 60,
  HKT: 8 * 60,
  MYT: 8 * 60,
  PHT: 8 * 60,
};

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
    console.log("Regex", regex);
    const match = text.match(regex);
    return match && match[groupIndex] ? match[groupIndex].trim() : null;
  } catch (e) {
    console.error(`Invalid Regex: ${pattern}`, e);
    return null;
  }
};

export const parseEmailWithProvider = (
  emailBody: string,
  provider: Provider,
  headers: GmailHeader[]
) => {
  if (!provider.config) return;

  let textToScan = emailBody;

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
  const rawDate = extract(textToScan, config.dateRegex, config.dateGroupIndex);
  const rawTime = extract(textToScan, config.dateRegex, config.timeGroupIndex);
  const rawTimezone = extract(
    textToScan,
    config.dateRegex,
    config.timezoneGroupIndex
  );

  const headerDate = headers.find(
    (h) => h.name.toLowerCase() === "date"
  )?.value;

  // Post-processing (Cleaning up currency, numbers & date)
  const currency = normalizeCurrencyCode(rawCurrency);

  const amount = rawAmount
    ? parseFloat(rawAmount.replace(/,/g, "")).toFixed(2)
    : null;

  const date = resolveDate({
    rawDate,
    rawTime,
    rawTimezone,
    headerDate,
  });

  return {
    merchant: rawMerchant || "Unknown",
    currency: currency,
    amount: amount,
    date: date,
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

const parseTimezoneToMinutes = (timezone: string | null): number | null => {
  if (!timezone) return null;

  const normalized = timezone.trim().toUpperCase();

  if (normalized in TIMEZONE_OFFSETS) {
    return TIMEZONE_OFFSETS[normalized];
  }

  const utcMatch = normalized.match(/^UTC([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (utcMatch) {
    const sign = utcMatch[1] === "+" ? 1 : -1;
    const hours = Number(utcMatch[2]);
    const minutes = Number(utcMatch[3] ?? "0");
    return sign * (hours * 60 + minutes);
  }

  const compactMatch = normalized.match(/^([+-])(\d{2})(\d{2})$/);
  if (compactMatch) {
    const sign = compactMatch[1] === "+" ? 1 : -1;
    const hours = Number(compactMatch[2]);
    const minutes = Number(compactMatch[3]);
    return sign * (hours * 60 + minutes);
  }

  const colonMatch = normalized.match(/^([+-])(\d{2}):(\d{2})$/);
  if (colonMatch) {
    const sign = colonMatch[1] === "+" ? 1 : -1;
    const hours = Number(colonMatch[2]);
    const minutes = Number(colonMatch[3]);
    return sign * (hours * 60 + minutes);
  }

  return null;
};

const resolveDate = ({
  rawDate,
  rawTime,
  rawTimezone,
  headerDate,
}: ResolveDateInput): string => {
  if (rawDate && rawTime) {
    const dateMatch = rawDate
      .trim()
      .match(/^(\d{1,2})\s+([A-Za-z]{3})(?:\s+(\d{4}))?$/);
    const timeMatch = rawTime.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);

    if (dateMatch && timeMatch) {
      const day = Number(dateMatch[1]);
      const month = MONTHS[dateMatch[2].toUpperCase()];
      const year = Number(dateMatch[3] ?? new Date().getFullYear());

      const hour = Number(timeMatch[1]);
      const minute = Number(timeMatch[2]);
      const second = Number(timeMatch[3] ?? "0");

      const offsetMinutes = parseTimezoneToMinutes(rawTimezone ?? "SGT") ?? 0; // default to SGT timezone for time without timezone
      const utcMs =
        Date.UTC(year, month, day, hour, minute, second) -
        offsetMinutes * 60_000;

      return new Date(utcMs).toISOString();
    }
  }

  if (headerDate) {
    return new Date(headerDate).toISOString();
  }

  return new Date().toISOString();
};
