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

export default function SettingsScreen() {
  const { user, isLoading, signIn } = useAuth();

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

  return (
    <ScrollView style={{ padding: 20, backgroundColor: "#f4f4f4" }}>
      {/* Gmail Connection */}
      <View style={styles.section}>
        <Text style={styles.title}>Gmail Connection</Text>
        <Text>{user ? `${user.email} connected` : "No email connected"}</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            console.log("Pressed, isLoading:", isLoading);
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
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Run Test</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

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
