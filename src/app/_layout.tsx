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
import { seedDatabase } from "../../db/seed";

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Run Drizzle migrations
  const { success, error } = useMigrations(db, migrations);

  useDrizzleStudio(expoDb);

  useEffect(() => {
    const init = async () => {
      if (success) {
        await seedDatabase();
        await SplashScreen.hideAsync();
      }
    };
    init();
  }, [success]);

  // Fallback Loading UI
  if (!success && !error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{ marginTop: 20 }}>Setting up database...</Text>
      </View>
    );
  }

  if (error) {
    console.error("Database Error:", error);
    SplashScreen.hideAsync();
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
          Database Error: {error.message ?? "Unknown Error"}
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
          <StatusBar style="dark" />
        </SafeAreaView>
      </AuthProvider>
    </SQLiteProvider>
  );
}
