import { providers } from "./providers";
import type {
  GmailHeader,
  GmailPayload,
  GmailMessagesList,
  GmailMessage,
} from "../../types/gmail";
import type { Transaction, TransactionProvider } from "../../types/transaction";

/**
 * Lists email message IDs matching the provider's specific query.
 * @returns A promise that resolves to an array of message IDs.
 */
const listEmailsForProvider = async (
  provider: TransactionProvider,
  googleAccessToken: string,
): Promise<string[]> => {
  try {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(provider.gmailQuery)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${googleAccessToken}` },
      },
    );

    if (!response.ok)
      throw new Error(
        `Failed to fetch email list for ${provider.name}. Status: ${response.status}`,
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
  provider: TransactionProvider,
  googleAccessToken: string,
): Promise<Transaction | null> => {
  try {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
      { headers: { Authorization: `Bearer ${googleAccessToken}` } },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch message ${messageId}. Status: ${response.status}`,
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

    // Decode Body (Reusable helper)
    const rawBody = getBody(emailData.payload); // Your existing getBody function
    const decodedBody = decodeBase64(rawBody); // Your existing decode logic
    const normalizedBody = normalizeText(decodedBody); // Your existing cleanup logic

    // Use the provider's specific parse logic
    const extractedData = provider.parse(emailData, normalizedBody);

    const parsedTransaction: Transaction = {
      source: provider.id,
      emailId: messageId,
      date,
      ...extractedData, // Merge the specific extracted fields
    } as Transaction;

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
  googleAccessToken: string,
): Promise<Transaction[]> => {
  const allTransactions: Transaction[] = [];
  for (const provider of providers) {
    console.log(`Processing provider: ${provider.name}...`);
    const messageIds = await listEmailsForProvider(provider, googleAccessToken); // Gets IDs
    for (const messageId of messageIds) {
      const transaction = await parseEmail(
        messageId,
        provider,
        googleAccessToken,
      );
      if (transaction) {
        allTransactions.push(transaction);
      }
    }
  }
  return allTransactions;
};

// --- Helper functions ---
const getHeader = (headers: GmailHeader[], name: string) =>
  headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;

// Get body from email payload
const getBody = (payload: GmailPayload): string | undefined => {
  if (payload.body && payload.body.data) return payload.body.data;
  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body && part.body.data) {
        return part.body.data;
      }
    }
  }
  return undefined;
};

// Decode Base64URL rawBody
// Regex to convert Base64URL --> Base64 then ASCII --> binary
const decodeBase64 = (body: string | undefined): string => {
  if (!body) return "";
  return atob(body.replace(/-/g, "+").replace(/_/g, "/"));
};

const normalizeText = (text: string): string => {
  return (
    text
      .replace(/\r\n/g, "\n") // Windows line break --> Unix line break
      .replace(/\n+/g, "\n") // Multiple newlines into one
      // .replace(/\s+/g, " ") // Multiple spaces into one
      .trim() // Remove leading, trailing spaces
  );
};
