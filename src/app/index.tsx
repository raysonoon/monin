import { useEffect } from "react";
import { Redirect } from "expo-router";
import { getIsLoggedIn } from "../hooks/useAuth";
import { HomeScreen } from "../screens/HomeScreen";
import { db } from "../../db/client";
import { categories } from "../../db/schema";

export default function Index() {
  useEffect(() => {
    const testDb = async () => {
      try {
        const data = await db.select().from(categories);
        console.log("Database Connection Successful! Data:", data);
      } catch (e) {
        console.error("Database Access Error:", e);
      }
    };
    testDb();
  }, []);
  if (!getIsLoggedIn()) {
    return <Redirect href="/login" />;
  }
  return <HomeScreen />;
}
