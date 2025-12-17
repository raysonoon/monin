import { openDatabaseSync } from "expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";

export const DATABASE_NAME = "expenses.db";

// Initialize the DB exactly once
export const expoDb = openDatabaseSync(DATABASE_NAME);
export const db = drizzle(expoDb);
