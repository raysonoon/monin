import { Text, TouchableOpacity, StyleSheet } from "react-native";

interface TextLinkProps {
  text: string;
  onPress: () => void;
  align?: "left" | "center" | "right";
}

export const TextLink = ({
  text,
  onPress,
  align = "center",
}: TextLinkProps) => (
  <TouchableOpacity style={styles.linkContainer} onPress={onPress}>
    <Text style={(styles.link, { textAlign: align })}>{text}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  linkContainer: {
    marginBottom: 20,
  },
  link: {
    color: "#333",
  },
});
