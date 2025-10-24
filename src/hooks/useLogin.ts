import { useState } from "react";

interface UseLoginReturn {
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  handleLogin: () => void;
}

export const useLogin = (): UseLoginReturn => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const handleLogin = () => {
    if (!email || !password) {
      alert("Please fill in all fields.");
      return;
    }
    console.log("Logging in with:", { email, password });
    /**
     * @todo Call your API or authentication service here
     */
  };

  return { email, setEmail, password, setPassword, handleLogin };
};
