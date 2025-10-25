import { useState } from "react";
import { router } from "expo-router";
import { setIsLoggedIn } from "./useAuth";

interface UseLoginReturn {
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  handleLogin: () => void;
}
/**
 * @todo Handles Login UI only - backend auth planned later
 */
export const useLogin = (): UseLoginReturn => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const handleLogin = () => {
    if (!email || !password) {
      alert("Please fill in all fields.");
      return;
    }
    console.log("Logging in with:", { email, password });
    setIsLoggedIn(true);
    // Temporary navigation to HomeScreen (app/index.tsx)
    router.replace("/");
  };

  return { email, setEmail, password, setPassword, handleLogin };
};
