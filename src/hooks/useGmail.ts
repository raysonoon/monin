import { useState, useCallback } from "react";
import { useAuth } from "../context/auth";
import { syncAllTransactions } from "../services/gmail/gmailService";
import { Transaction } from "../types/transaction";

export const useGmail = () => {
  const { user, isLoading, googleAccessToken, signIn, signOut } = useAuth();

  const [paylahEmailData, setPaylahEmailData] = useState<Transaction | null>(
    null,
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const listPaylahEmails = useCallback(async () => {
    if (!googleAccessToken) {
      setSyncError("Not connected to Gmail.");
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    try {
      // Note: In the final version, you would use syncAllTransactions
      // For the initial 'Run Test' button, we'll keep the PayLah test specific.
      // This assumes you refactored the original PayLah logic into its own provider/function

      // For now, let's call the generic sync, and just use the first result for display
      const transactions = await syncAllTransactions(googleAccessToken);

      if (transactions.length > 0) {
        // Display the most recent transaction for the 'Run Test' result
        setPaylahEmailData(transactions[0]);
      } else {
        setPaylahEmailData(null);
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
  }, [googleAccessToken]);

  return {
    // Auth State
    user,
    signIn,
    signOut,
    isLoading: isLoading || isSyncing,

    // Sync State
    paylahEmailData,
    listPaylahEmails,
    isSyncing,
    syncError,
  };
};
