import { View, Text, ScrollView, StyleSheet } from "react-native";
import { CartesianChart, BarGroup } from "victory-native";
import { useFont } from "@shopify/react-native-skia";
import segoe from "../../assets/fonts/segoeui.ttf";
import Ionicons from "@expo/vector-icons/Ionicons";

type Category = {
  name: string;
  amount: number;
  color: string;
};

const data = [
  { month: "Jan", income: 2400, expense: 1800 },
  { month: "Feb", income: 2600, expense: 1900 },
  { month: "Mar", income: 2300, expense: 2000 },
  { month: "Apr", income: 2500, expense: 2100 },
  { month: "May", income: 2700, expense: 2200 },
  { month: "Jun", income: 2600, expense: 2300 },
];

const categories: Category[] = [
  { name: "Food", amount: 800, color: "#f87171" },
  { name: "Transport", amount: 300, color: "#60a5fa" },
  { name: "Bills", amount: 500, color: "#fbbf24" },
  { name: "Shopping", amount: 400, color: "#34d399" },
];

const insights = [
  {
    icon: <Ionicons name="trending-up" size={28} color="#16a34a" />,
    text: "Your income increased by 8% this month.",
  },
  {
    icon: <Ionicons name="trending-down" size={28} color="#dc2626" />,
    text: "You spent 12% more on dining out.",
  },
];

export const HomeScreen = () => {
  const font = useFont(segoe, 16);
  const yMin = Math.min(...data.flatMap((d) => [d.income, d.expense]));
  const yMax = Math.max(...data.flatMap((d) => [d.income, d.expense]));

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

      <View style={styles.chartContainer}>
        <Text style={styles.sectionTitle}>Monthly Cash Flow</Text>
        <CartesianChart
          data={data}
          xKey="month"
          yKeys={["income", "expense"]}
          domain={{
            y: [yMin - 200, yMax + 200],
          }}
          domainPadding={{ left: 40, right: 40 }}
          axisOptions={{
            font,
            lineColor: {
              grid: {
                x: "rgba(0,0,0,0)",
                y: "#e5e7eb",
              },
              frame: "rgba(0,0,0,0.05)",
            },
          }}
        >
          {({ points, chartBounds }) => (
            <BarGroup
              chartBounds={chartBounds}
              betweenGroupPadding={0.3}
              roundedCorners={{ topLeft: 4, topRight: 4 }}
              barWidth={16}
            >
              <BarGroup.Bar points={points.income} color="#16a34a" />
              <BarGroup.Bar points={points.expense} color="#dc2626" />
            </BarGroup>
          )}
        </CartesianChart>
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendColor, { backgroundColor: "#16a34a" }]}
            />
            <Text style={styles.legendLabel}>Income</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendColor, { backgroundColor: "#dc2626" }]}
            />
            <Text style={styles.legendLabel}>Expense</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Spending by Category</Text>
        {categories.map((cat) => (
          <View key={cat.name} style={styles.categoryRow}>
            <View
              style={[styles.categoryColor, { backgroundColor: cat.color }]}
            />
            <Text style={styles.categoryName}>{cat.name}</Text>
            <Text style={styles.categoryAmount}>${cat.amount}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Recent Insights</Text>
        {insights.map((item, index) => (
          <View key={index} style={styles.insightRow}>
            {item.icon}
            <Text style={styles.insightText}>{item.text}</Text>
          </View>
        ))}
      </View>
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
    gap: 15,
  },
  card: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 18,
    marginBottom: 15,
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
    padding: 18,
    marginBottom: 15,
    elevation: 3,
    height: 300,
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 10,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 6,
  },
  legendLabel: {
    fontSize: 14,
    color: "#333",
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  categoryColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 10,
  },
  categoryName: {
    flex: 1,
    fontSize: 16,
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: "600",
  },
  insightRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  insightText: {
    marginLeft: 10,
    fontSize: 15,
    color: "#333",
  },
});
