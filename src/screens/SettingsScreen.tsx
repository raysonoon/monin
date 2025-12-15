import {
  View,
  Text,
  Switch,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useState } from "react";
import { useAuth } from "../context/auth";
import { BASE_URL } from "../../utils/constants";
import type {
  GmailPayload,
  GmailMessage,
  GmailMessagesList,
} from "../types/gmail";
import type { Transaction } from "../types/transaction";

export const SettingsScreen = () => {
  const { user, isLoading, googleAccessToken, signIn, signOut, fetchWithAuth } =
    useAuth();
  const [data, setData] = useState();
  const [paylahEmailData, setPaylahEmailData] = useState<
    Transaction | undefined
  >();

  const [autoSync, setAutoSync] = useState(true);
  const [skipDuplicates, setSkipDuplicates] = useState(false);
  const [manualApproval, setManualApproval] = useState(true);

  const recognizedSenders = [
    { name: "Amazon", category: "Shopping" },
    { name: "Uber", category: "Transportation" },
    { name: "Starbucks", category: "Dining" },
    { name: "Netflix", category: "Subscriptions" },
    { name: "DoorDash", category: "Dining" },
    { name: "Spotify", category: "Subscriptions" },
  ];

  const [senderSelected, setSenderSelected] = useState({});

  const getProtectedData = async () => {
    const response = await fetchWithAuth(`${BASE_URL}/api/protected/data`, {
      method: "GET",
    });

    const data = await response.json();
    setData(data);
  };

  const listPaylahEmails = async () => {
    try {
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent("subject:(Fwd: Transaction Alerts) 'paylah.alert@dbs.com'")}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${googleAccessToken}`,
          },
        },
      );

      if (!response.ok) {
        const error = await response.json();
        alert("Failed to fetch PayLah emails: " + JSON.stringify(error));
        return;
      }
      const paylahEmails: GmailMessagesList = await response.json();
      console.log("Raw data: ", paylahEmails);

      // Iterate over each message and call parsePaylahEmail
      if (paylahEmails.messages && Array.isArray(paylahEmails.messages)) {
        for (const msg of paylahEmails.messages) {
          await parsePaylahEmail(msg.id);
        }
      }
    } catch (err) {
      console.error("Error: " + err);
    }
  };

  const parsePaylahEmail = async (messageId: string) => {
    try {
      const response = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${googleAccessToken}`,
          },
        },
      );

      if (!response.ok) {
        const error = await response.json();
        alert("Failed to fetch Paylah email: " + JSON.stringify(error));
        return;
      }
      const paylahEmail: GmailMessage = await response.json();
      const transaction = await parseTransaction(paylahEmail);
      setPaylahEmailData(transaction);
      // alert("Parsing PayLah email: " + JSON.stringify(paylahEmail, null, 2));
    } catch (err) {
      console.error("Error: " + err);
    }
  };

  const parseTransaction = async (
    paylahEmail: GmailMessage,
  ): Promise<Transaction> => {
    const headers = paylahEmail.payload.headers;
    const getHeader = (name: string) =>
      headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value;

    const date = getHeader("Date") || 0;
    console.log("Date extracted from header:", date);
    const emailId = paylahEmail.id;

    // Get and decode the body
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
    const rawBody = getBody(paylahEmail.payload);
    // Regex to convert Base64URL --> Base64 then ASCII --> binary
    const decodedBody = rawBody
      ? atob(rawBody.replace(/-/g, "+").replace(/_/g, "/"))
      : "";

    const normalizedBody = decodedBody
      .replace(/\r\n/g, "\n") // Windows line break --> Unix line break
      .replace(/\n+/g, "\n") // Multiple newlines into one
      // .replace(/\s+/g, " ") // Multiple spaces into one
      .trim(); // Remove leading, trailing spaces

    console.log("Normalized email body:", normalizedBody);

    const merchantMatch = normalizedBody.match(/^to:\s*([a-z0-9 .&()-]+)$/im);
    console.log("merchantMatch:", merchantMatch);

    const merchant = merchantMatch?.[1]?.trim();
    console.log("merchant:", merchant);

    const amountMatch = normalizedBody.match(/(SGD)\s?([\d,.]+)/);
    console.log("amountMatch:", amountMatch);

    const currency = amountMatch?.[1];
    console.log("currency:", currency);
    const amount = amountMatch
      ? parseFloat(amountMatch[2].replace(",", "")).toFixed(2)
      : null;
    console.log("amount:", amount);

    return {
      source: "gmail",
      merchant: merchant,
      amount: amount,
      currency: currency,
      date: new Date(date).toISOString(),
      emailId,
    };
  };

  return (
    <ScrollView
      style={{ padding: 20, backgroundColor: "#f4f4f4" }}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Gmail Connection */}
      <View style={styles.section}>
        <Text style={styles.title}>Gmail Connection</Text>
        <Text>{user ? `${user.email} connected` : "No email connected"}</Text>

        {user ? (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#dc2626" }]}
            onPress={() => {
              console.log("Signing out from gmail");
              signOut();
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Disconnect Gmail</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              console.log("Signing in to gmail");
              signIn();
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Connect your Gmail</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Protected Data */}
      <View style={styles.section}>
        <Text style={styles.title}>Protected Data</Text>
        <Text>{JSON.stringify(data)}</Text>
        <TouchableOpacity style={styles.button} onPress={getProtectedData}>
          <Text style={styles.buttonText}>Fetch protected data</Text>
        </TouchableOpacity>
      </View>

      {/* PayLah Data */}
      <View style={styles.section}>
        <Text style={styles.title}>PayLah Data</Text>
        <Text>{JSON.stringify(paylahEmailData)}</Text>
      </View>

      {/* Sync Settings */}
      <View style={styles.section}>
        <Text style={styles.title}>Sync Settings</Text>

        <View style={styles.row}>
          <Text>Auto-sync new emails</Text>
          <Switch value={autoSync} onValueChange={setAutoSync} />
        </View>

        <Text style={{ marginTop: 10 }}>Sync frequency</Text>
        <TextInput placeholder="Every 15 minutes" style={styles.input} />

        <Text style={{ marginTop: 10 }}>Look back period</Text>
        <TextInput placeholder="Last 7 days" style={styles.input} />
      </View>

      {/* Recognized Senders */}
      <View style={styles.section}>
        <Text style={styles.title}>Recognized Senders</Text>

        {recognizedSenders.map((sender, i) => (
          <View key={i} style={styles.row}>
            <Text>{sender.name}</Text>
            {/* <Switch
              value={senderSelected[sender.name] || false}
              onValueChange={(v) =>
                setSenderSelected({ ...senderSelected, [sender.name]: v })
              }
            /> */}
          </View>
        ))}
      </View>

      {/* Advanced Settings */}
      <View style={styles.section}>
        <Text style={styles.title}>Advanced Settings</Text>

        <Text>Custom email filters</Text>
        <TextInput placeholder="Enter keywords" style={styles.input} />

        <View style={styles.row}>
          <Text>Skip duplicate detection</Text>
          <Switch value={skipDuplicates} onValueChange={setSkipDuplicates} />
        </View>

        <View style={styles.row}>
          <Text>Require manual approval</Text>
          <Switch value={manualApproval} onValueChange={setManualApproval} />
        </View>
      </View>

      {/* Run Test */}
      <TouchableOpacity style={styles.button} onPress={listPaylahEmails}>
        <Text style={styles.buttonText}>Run Test</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  section: {
    padding: 15,
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginTop: 5,
  },
  button: {
    backgroundColor: "#4a90e2",
    padding: 12,
    alignItems: "center",
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
});
