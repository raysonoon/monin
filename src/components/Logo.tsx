import { View, StyleSheet } from "react-native";

export const Logo = () => {
  return <View style={styles.logo} />;
};

const styles = StyleSheet.create({
  logo: {
    width: 150,
    height: 150,
    borderRadius: 100,
    backgroundColor: "#d3d3d3",
    alignSelf: "center",
    marginBottom: 60,
  },
});
