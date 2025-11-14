import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { CartesianChart, BarGroup } from "victory-native";
import { useFont } from "@shopify/react-native-skia";
import { useRouter } from "expo-router";
import segoe from "../../assets/fonts/segoeui.ttf";
import Ionicons from "@expo/vector-icons/Ionicons";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

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

  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Financial Dashboard</Text>
        <TouchableOpacity
          style={styles.settingsContainer}
          onPress={() => router.navigate("/settings")}
        >
          <Ionicons name="settings-outline" size={24} color="#6B7280" />
          <Text style={styles.settingsText}>Settings</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.cardRow}>
        <View style={styles.card}>
          <View style={styles.cardIcons}>
            <Feather name="dollar-sign" size={24} color="#6B7280"></Feather>
            <View style={styles.cashFlowTrendContainer}>
              <MaterialCommunityIcons
                name="arrow-top-right"
                size={16}
                color="#059669"
              />
              <Text style={styles.cashFlowTrendText}>12%</Text>
            </View>
          </View>
          <Text style={styles.cardValue}>$1,100</Text>
          <Text style={styles.cardLabel}>Net Cash Flow</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.cardIcons}>
            <Ionicons name="trending-down" size={24} color="#6B7280" />
            <View style={styles.expensesTrendContainer}>
              <MaterialCommunityIcons
                name="arrow-bottom-right"
                size={16}
                color="#DC2626"
              />
              <Text style={styles.expensesTrendText}>8%</Text>
            </View>
          </View>
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  header: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 20,
  },
  settingsContainer: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#6B7280",
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  settingsText: {
    color: "#6B7280",
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
  cardIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 48,
    marginBottom: 12,
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
  cashFlowTrendContainer: {
    backgroundColor: "#dcfce7",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  cashFlowTrendText: {
    color: "#059669",
  },
  expensesTrendContainer: {
    backgroundColor: "#FEE2E2",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  expensesTrendText: {
    color: "#DC2626",
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
