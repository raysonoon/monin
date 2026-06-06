import { htmlToText } from "html-to-text";
import {
  GMAIL_QUICK_LOOKBACK_DAYS,
  GMAIL_QUICK_MAX_RESULTS,
} from "../../../utils/constants";
import { parseEmailWithProvider } from "../../../utils/gmailParser";
import { categorizationService } from "../categorizationService";
import { convertToSGD } from "../fxService";

import type {
  GmailPayload,
  GmailPart,
  GmailMessagesList,
  GmailMessage,
} from "../../types/gmail";
import { db } from "../../../db/client";
import {
  providers as providersSchema,
  Provider,
  transactions,
  NewTransaction,
} from "../../../db/schema";
import { getGeneralWalletId } from "../../../db/seed";

type ParsedNewTransaction = Omit<
  NewTransaction,
  "baseCurrency" | "baseAmount" | "fxRate" | "fxDate"
>;

type SyncOptions = {
  mode?: "full" | "quick";
  lookbackDays?: number;
  quickMaxResults?: number;
  fullPageSize?: number;
};

const buildQuery = (provider: Provider, options: SyncOptions) => {
  const config = JSON.parse(provider.config);
  const base = config.gmailQuery ?? "";

  if (options.mode === "quick") {
    const days = options.lookbackDays ?? GMAIL_QUICK_LOOKBACK_DAYS;
    return `${base} newer_than:${days}d`;
  }

  return base;
};

/**
 * Lists email message IDs matching the provider's specific query.
 * @returns A promise that resolves to an array of message IDs.
 */
const listEmailsForProvider = async (
  provider: Provider,
  googleAccessToken: string,
  options: SyncOptions = {}
): Promise<string[]> => {
  const mode = options.mode ?? "full";
  const query = buildQuery(provider, options);
  // const config = JSON.parse(provider.config);
  const pageSize =
    mode === "quick"
      ? Math.min(options.quickMaxResults ?? GMAIL_QUICK_MAX_RESULTS, 500)
      : Math.min(options.fullPageSize ?? 500, 500);

  const maxPages = mode === "quick" ? 1 : 100;

  const ids: string[] = [];
  let pageToken: string | undefined = undefined;
  let page = 0;

  try {
    do {
      const params = new URLSearchParams({
        q: query,
        maxResults: String(pageSize),
      });
      if (pageToken) params.set("pageToken", pageToken);

      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${googleAccessToken}` },
        }
      );

      if (!response.ok)
        throw new Error(
          `Failed to fetch email list for ${provider.name}. Status: ${response.status}`
        );

      const data: GmailMessagesList & { nextPageToken?: string } =
        await response.json();
      if (data.messages?.length) ids.push(...data.messages.map((m) => m.id));

      pageToken = data.nextPageToken;
      page += 1;
    } while (pageToken && page < maxPages);
  } catch (err) {
    console.error(`Error fetching for ${provider.name}:`, err);
    return [];
  }

  return ids;
};

/**
 * Fetches, decodes, and parses a single email using the provider's specific strategy.
 * @returns A promise that resolves to a Transaction object or null on failure.
 */
const parseEmail = async (
  messageId: string,
  provider: Provider,
  googleAccessToken: string
): Promise<NewTransaction | null> => {
  try {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
      { headers: { Authorization: `Bearer ${googleAccessToken}` } }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch message ${messageId}. Status: ${response.status}`
      );
    }

    const emailData: GmailMessage = await response.json();

    // Parse date from header
    const headers = emailData.payload.headers;
    const rawBody = getBody(emailData.payload);
    const decodedBody = decodeBase64(rawBody);
    const plainBody = htmlToPlain(decodedBody);
    const normalizedBody = normalizeText(plainBody);

    // Use the provider's specific parse logic
    // const extractedData = provider.parse(emailData, normalizedBody);
    const extractedData = parseEmailWithProvider(
      normalizedBody,
      provider,
      headers
    );

    const normalizedMerchant =
      extractedData?.merchant
        ?.replace(/\s+on your credit card.*$/i, "")
        .trim() ?? "Unknown"; // Handle null merchants safely by defaulting to "Unknown"
    const merchantName =
      normalizedMerchant.toLowerCase() === "cash amount of"
        ? "Cash Withdrawal"
        : normalizedMerchant;

    // Determine category based on the extracted merchant name
    const category = categorizationService.categorizeMerchant(merchantName);

    const parsedTransaction: ParsedNewTransaction = {
      emailId: messageId,
      providerId: provider.id,
      merchant: merchantName ?? "Unknown",
      amount: extractedData?.amount ? Number(extractedData.amount) : 0,
      currency: extractedData?.currency ?? "?",
      date: extractedData?.date ?? new Date().toISOString(),
      category: category,
      source: provider.name,
      type: provider.type,
    };

    const { baseAmount, fxRate, fxDate } = await convertToSGD(
      parsedTransaction.amount,
      parsedTransaction.currency,
      parsedTransaction.date
    );

    const parsedTransactionWithBase: NewTransaction = {
      ...parsedTransaction,
      baseCurrency: "SGD",
      baseAmount,
      fxRate,
      fxDate,
    };

    return parsedTransactionWithBase;
  } catch (err) {
    console.error(`Failed to parse email ${messageId}:`, err);
    return null;
  }
};

/**
 * Coordinates the synchronization process across all defined email providers.
 * @returns A promise that resolves to an array of all successfully parsed Transaction objects.
 */
const syncTransactions = async (
  googleAccessToken: string,
  options: SyncOptions = { mode: "full" }
): Promise<NewTransaction[]> => {
  await categorizationService.init(); // Initialise rules from DB into memory before loop
  const generalWalletId = await getGeneralWalletId();
  const providers = await db.select().from(providersSchema);

  // Get a list of all email IDs already in DB
  const existingRecords = await db
    .select({ emailId: transactions.emailId })
    .from(transactions);

  const existingIds = new Set(existingRecords.map((r) => r.emailId)); // Set lookup O(1) complexity

  const allTransactions: NewTransaction[] = [];

  for (const provider of providers) {
    const messageIds = await listEmailsForProvider(
      provider,
      googleAccessToken,
      options
    );

    for (const messageId of messageIds) {
      if (existingIds.has(messageId)) {
        continue;
      }

      const transaction = await parseEmail(
        messageId,
        provider,
        googleAccessToken
      );
      if (!transaction) continue;

      // Ignore duplicates via unique(email_id)
      await db
        .insert(transactions)
        .values({ ...transaction, walletId: generalWalletId })
        .onConflictDoNothing({ target: transactions.emailId });

      allTransactions.push(transaction);
    }
  }

  return allTransactions;
};

/**
 * Full sync mode: sync all emails (up to 500 pages)
 */
export const fullSyncTransactions = async (googleAccessToken: string) =>
  syncTransactions(googleAccessToken, { mode: "full", fullPageSize: 500 });

/**
 * Quick sync mode: sync emails newer than 7 days and capped to 100 emails per page
 */
export const quickSyncTransactions = async (googleAccessToken: string) =>
  syncTransactions(googleAccessToken, {
    mode: "quick",
    lookbackDays: GMAIL_QUICK_LOOKBACK_DAYS,
    quickMaxResults: GMAIL_QUICK_MAX_RESULTS,
  });

// --- Helper functions ---

// Get body from email payload recursively
const getBody = (payload: GmailPayload | GmailPart): string | undefined => {
  // Base case: if data exists at top level, return
  if (payload.body && payload.body.data) return payload.body.data;

  // If there are parts, search through them
  if (payload.parts && Array.isArray(payload.parts)) {
    // First, look for text/plain in current parts
    const plainTextPart = payload.parts.find(
      (p) => p.mimeType === "text/plain" && p.body.data
    );
    if (plainTextPart) return plainTextPart.body.data;

    // Second, look for text/html in current parts
    const htmlPart = payload.parts.find(
      (p) => p.mimeType === "text/html" && p.body.data
    );
    if (htmlPart) return htmlPart.body.data;

    // Third, if neither found, RECURSE into sub-parts
    for (const part of payload.parts) {
      if (part.parts) {
        const nestedData = getBody(part); // Recursive call
        if (nestedData) return nestedData;
      }
    }
  }
  return undefined;
};

// Decode Base64URL rawBody
const decodeBase64 = (body: string | undefined): string => {
  if (!body) return "";

  // Sanitize Base64URL to standard Base64
  const base64 = body.replace(/-/g, "+").replace(/_/g, "/");

  // Decode to binary string
  const binaryString = atob(base64);

  // Convert to Uint8Array
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Decode bytes to a proper UTF-8 string
  return new TextDecoder("utf-8").decode(bytes);
};

// Converts text/html to text/plain
const htmlToPlain = (html: string): string => {
  return htmlToText(html, {
    wordwrap: false,
    preserveNewlines: true,
    selectors: [
      { selector: "img", format: "skip" },
      { selector: "a", options: { ignoreHref: true } },
    ],
  });
};

// Normalize text for easier regex
const normalizeText = (text: string): string => {
  return text
    .replace(/\r\n/g, "\n") // Windows line break --> Unix line break
    .replace(/\n+/g, "\n") // Multiple newlines into one
    .trim(); // Remove leading, trailing spaces
};
