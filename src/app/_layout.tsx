import { useEffect } from "react";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../context/auth";
import { SQLiteProvider } from "expo-sqlite";
import { useDrizzleStudio } from "expo-drizzle-studio-plugin";
import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";
import migrations from "../../drizzle/migrations";
import * as SplashScreen from "expo-splash-screen";
import { expoDb, db, DATABASE_NAME } from "../../db/client";

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Run Drizzle migrations
  const { success, error } = useMigrations(db, migrations);

  useDrizzleStudio(expoDb);

  useEffect(() => {
    console.log("Migration State - Success:", success, "Error:", error);
    // Hide Splash Screen once DB is ready (or if an error occurs)
    if (success || error) {
      if (error) console.error("Migration Error:", error);
      SplashScreen.hideAsync();
    }
  }, [success, error]);

  // Fallback UI
  if (!success && !error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{ marginTop: 20 }}>Setting up database...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <Text style={{ color: "red", fontSize: 16, textAlign: "center" }}>
          Migration Error: {error.message ?? "Unknown Error"}
        </Text>
        <Text style={{ marginTop: 10, fontSize: 12, color: "#555" }}>
          Check console logs for details.
        </Text>
      </View>
    );
  }

  return (
    <SQLiteProvider
      databaseName={DATABASE_NAME}
      options={{ enableChangeListener: true }}
    >
      <AuthProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
          <Stack screenOptions={{ headerShown: false }} />
          <StatusBar style="auto" />
        </SafeAreaView>
      </AuthProvider>
    </SQLiteProvider>
  );
}
