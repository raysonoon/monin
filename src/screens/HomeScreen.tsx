import { View, Text, ScrollView, StyleSheet } from "react-native";
import { CartesianChart, Line } from "victory-native";

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
}

const data: MonthlyData[] = [
  { month: "Jan", income: 2400, expense: 1800 },
  { month: "Feb", income: 2600, expense: 1900 },
  { month: "Mar", income: 2300, expense: 2000 },
  { month: "Apr", income: 2500, expense: 2100 },
  { month: "May", income: 2700, expense: 2200 },
  { month: "Jun", income: 2600, expense: 2300 },
];

export const HomeScreen = () => {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>Financial Dashboard</Text>

      <View style={styles.cardRow}>
        <View style={styles.card}>
          <Text style={styles.cardValue}>$1,100</Text>
          <Text style={styles.cardLabel}>Net Cash Flow</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardValue}>$3,000</Text>
          <Text style={styles.cardLabel}>Total Expenses</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Monthly Cash Flow</Text>

      <Text style={styles.sectionTitle}>Spending by Category</Text>
      {/* Here you’d list your spending categories, pie chart etc */}
      {/* ... */}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: "#fff",
  },
  header: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 20,
  },
  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  card: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 18,
    marginHorizontal: 6,
    borderRadius: 12,
    elevation: 3,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: "600",
  },
  cardLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
  chartContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    marginBottom: 30,
    elevation: 3,
  },
});
