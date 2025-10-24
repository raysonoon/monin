import { TouchableOpacity, Text, StyleSheet } from "react-native";

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
}

export const PrimaryButton = ({ title, onPress }: PrimaryButtonProps) => {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#f2f2f2",
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  text: {
    textAlign: "center",
    fontWeight: "500",
    color: "#333",
  },
});
