import { htmlToText } from "html-to-text";
import { parseEmailWithProvider } from "../../../utils/gmailParser";
import { categorizationService } from "../categorizationService";
import type {
  GmailHeader,
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

/**
 * Lists email message IDs matching the provider's specific query.
 * @returns A promise that resolves to an array of message IDs.
 */
const listEmailsForProvider = async (
  provider: Provider,
  googleAccessToken: string
): Promise<string[]> => {
  const config = JSON.parse(provider.config);
  try {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(config.gmailQuery)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${googleAccessToken}` },
      }
    );

    if (!response.ok)
      throw new Error(
        `Failed to fetch email list for ${provider.name}. Status: ${response.status}`
      );

    const data: GmailMessagesList = await response.json();

    return data.messages ? data.messages.map((m) => m.id) : [];
  } catch (err) {
    console.error(`Error fetching for ${provider.name}:`, err);
    return [];
  }
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
    const dateHeader = getHeader(headers, "Date");
    const date = dateHeader
      ? new Date(dateHeader).toISOString()
      : new Date().toISOString();
    console.log("Date extracted from header:", date);

    const rawBody = getBody(emailData.payload);
    const decodedBody = decodeBase64(rawBody);
    const plainBody = htmlToPlain(decodedBody);
    const normalizedBody = normalizeText(plainBody);

    // Use the provider's specific parse logic
    // const extractedData = provider.parse(emailData, normalizedBody);
    const extractedData = parseEmailWithProvider(normalizedBody, provider);

    // Handle null merchants safely by defaulting to "Unknown"
    const merchantName = extractedData?.merchant ?? "Unknown";

    // Determine category based on the extracted merchant name
    const category = categorizationService.categorizeMerchant(merchantName);

    const parsedTransaction: NewTransaction = {
      emailId: messageId,
      providerId: provider.id,
      merchant: extractedData?.merchant ?? "Unknown",
      amount: extractedData?.amount ? Number(extractedData.amount) : 0,
      currency: extractedData?.currency ?? "?",
      date,
      category: category,
      source: provider.name,
      type: "expense",
    };

    console.log("Parsed Transaction:", parsedTransaction);
    return parsedTransaction;
  } catch (err) {
    console.error(`Failed to parse email ${messageId}:`, err);
    return null;
  }
};

/**
 * Coordinates the full synchronization process across all defined email providers.
 * @returns A promise that resolves to an array of all successfully parsed Transaction objects.
 */
export const syncAllTransactions = async (
  googleAccessToken: string
): Promise<NewTransaction[]> => {
  await categorizationService.init(); // Initialise rules from DB into memory before loop

  const providers = await db.select().from(providersSchema);

  // Get a list of all email IDs already in DB
  const existingRecords = await db
    .select({ emailId: transactions.emailId })
    .from(transactions);
  const existingIds = new Set(existingRecords.map((r) => r.emailId)); // Set lookup O(1) complexity

  const allTransactions: NewTransaction[] = [];

  for (const provider of providers) {
    console.log(`Processing provider: ${provider.name}...`);

    const messageIds = await listEmailsForProvider(provider, googleAccessToken); // Gets IDs

    for (const messageId of messageIds) {
      // Skip parsing email if emailId already in set
      if (existingIds.has(messageId)) {
        console.log(`Skipping already parsed email: ${messageId}`);
        continue;
      }
      const transaction = await parseEmail(
        messageId,
        provider,
        googleAccessToken
      );

      if (transaction) {
        // 3. Save to DB immediately (or collect and bulk insert)
        await db.insert(transactions).values({
          ...transaction,
        });
        allTransactions.push(transaction);
      }
    }
  }
  return allTransactions;
};

// --- Helper functions ---
const getHeader = (headers: GmailHeader[], name: string) =>
  headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;

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
  // Regex to convert Base64URL --> Base64 then ASCII --> binary
  return atob(body.replace(/-/g, "+").replace(/_/g, "/"));
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
