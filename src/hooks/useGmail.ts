import { useState, useCallback, useEffect } from "react";
import { useAuth } from "../context/auth";
import {
  quickSyncTransactions,
  fullSyncTransactions,
} from "../services/gmail/gmailService";

export const useGmail = () => {
  const {
    user,
    isLoading,
    authStatusMessage,
    signIn,
    signOut,
    ensureGoogleAccessToken,
  } = useAuth();

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsSyncing(false);
      setSyncError(null);
    }
  }, [user]);

  const syncEmails = useCallback(
    async (mode: "full" | "quick" = "full") => {
      setIsSyncing(true);
      setSyncError(null);
      try {
        const googleAccessToken = await ensureGoogleAccessToken();

        if (!googleAccessToken) {
          setSyncError("Not connected to Gmail.");
          return;
        }
        const transactions =
          mode === "quick"
            ? await quickSyncTransactions(googleAccessToken)
            : await fullSyncTransactions(googleAccessToken);

        console.log("Total Transactions Synced:", transactions.length);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred.";
        setSyncError("Sync failed: " + message);
        console.error(error);
      } finally {
        setIsSyncing(false);
      }
    },
    [ensureGoogleAccessToken]
  );

  return {
    // Auth State
    user,
    signIn,
    signOut,
    isLoading,

    // Sync State
    fullSyncEmails: () => syncEmails("full"),
    quickSyncEmails: () => syncEmails("quick"),
    isSyncing,
    syncError,
    authStatusMessage,
  };
};
