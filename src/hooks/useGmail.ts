import { useState, useCallback } from "react";
import { useAuth } from "../context/auth";
import { syncAllTransactions } from "../services/gmail/gmailService";
import type { ParsedTransaction } from "../types/transaction";

export const useGmail = () => {
  const { user, isLoading, signIn, signOut, ensureGoogleAccessToken } =
    useAuth();

  const [emailData, setEmailData] = useState<ParsedTransaction | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const listEmails = useCallback(async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const googleAccessToken = await ensureGoogleAccessToken();

      if (!googleAccessToken) {
        setSyncError("Not connected to Gmail.");
        return;
      }
      const transactions = await syncAllTransactions(googleAccessToken);

      if (transactions.length > 0) {
        // Display the most recent transaction for the 'Run Test' result
        const tx = transactions[0];
        setEmailData({
          date: tx.date,
          id: tx.id ?? 0,
          emailId: tx.emailId,
          providerId: tx.providerId ?? null,
          merchant: tx.merchant,
          amount: tx.amount,
          currency: tx.currency,
          category: tx.category,
          source: tx.source,
          type: tx.type,
          notes: tx.notes ?? null,
          createdAt: tx.createdAt ?? null,
        });
      } else {
        setEmailData(null);
      }

      console.log("Total Transactions Synced:", transactions.length);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unknown error occurred.";
      setSyncError("Sync failed: " + message);
      console.error(error);
    } finally {
      setIsSyncing(false);
    }
  }, [ensureGoogleAccessToken]);

  return {
    // Auth State
    user,
    signIn,
    signOut,
    isLoading: isLoading || isSyncing,

    // Sync State
    emailData,
    listEmails,
    isSyncing,
    syncError,
  };
};
