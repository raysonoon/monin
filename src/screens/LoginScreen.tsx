import { View, StyleSheet } from "react-native";
import { Logo } from "../components/Logo";
import { InputField } from "../components/InputField";
import { PrimaryButton } from "../components/PrimaryButton";
import { TextLink } from "../components/TextLink";
import { useLogin } from "../hooks/useLogin";

export const LoginScreen = () => {
  const { email, setEmail, password, setPassword, handleLogin } = useLogin();

  return (
    <View style={styles.container}>
      <Logo />

      <InputField
        placeholder="Your email address"
        value={email}
        onChangeText={setEmail}
      />

      <InputField
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TextLink
        text="Forgot password?"
        align="right"
        onPress={() => console.log("Forgot password pressed")}
      />

      <PrimaryButton title="Sign in" onPress={handleLogin} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
});
