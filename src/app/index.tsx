import { Redirect } from "expo-router";
import { getIsLoggedIn } from "../hooks/useAuth";
import { HomeScreen } from "../screens/HomeScreen";

export default function Index() {
  if (!getIsLoggedIn()) {
    return <Redirect href="/login" />;
  }
  return <HomeScreen />;
}
