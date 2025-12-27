import { useState, useMemo } from "react";
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
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { db } from "../../db/client";
import {
  transactions as transactionsSchema,
  Transaction,
  categories as categoriesSchema,
  Category,
} from "../../db/schema";
import TransactionDialog from "../components/TransactionDialog";
import {
  getMonthlyCashFlow,
  getCategorySpending,
  getCategoryColorMap,
} from "../services/transaction/transactionHelper";
import segoe from "../../assets/fonts/segoeui.ttf";
import Ionicons from "@expo/vector-icons/Ionicons";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

export const HomeScreen = () => {
  const font = useFont(segoe, 14);

  const router = useRouter();

  // Transaction dialog state
  const [transactionDialogVisible, setTransactionDialogVisible] =
    useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);

  const handleAddTransaction = () => {
    setEditingTransaction(null); // Clear data for "Add Mode"
    setTransactionDialogVisible(true);
  };

  const handleEditTransaction = (txn: Transaction) => {
    setEditingTransaction(txn); // Set data for "Edit Mode"
    setTransactionDialogVisible(true);
  };

  const { data: transactions = [] } = useLiveQuery(
    db.select().from(transactionsSchema)
  );
  const { data: categories = [] } = useLiveQuery(
    db.select().from(categoriesSchema)
  );

  const chartData = useMemo(
    () => getMonthlyCashFlow(transactions),
    [transactions]
  );

  const filteredChartData = useMemo(() => {
    return chartData.filter((d) => d.income > 0 || d.expense > 0);
  }, [chartData]);

  // Reusable category color map
  const colorMap = useMemo(() => getCategoryColorMap(categories), [categories]);

  const categorySpending = useMemo(
    () => getCategorySpending(transactions, colorMap),
    [transactions, colorMap]
  );

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions]);

  // Summary logic
  const netCashFlow = useMemo(
    () =>
      transactions.reduce(
        (acc, t) => (t.type === "income" ? acc + t.amount : acc - t.amount),
        0
      ),
    [transactions]
  );

  const { currentMonthExpense, expenseTrend, cashFlowTrend, dynamicInsights } =
    useMemo(() => {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      // Filter transactions by month
      const thisMonthTransactions = transactions.filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });

      const prevMonthTransactions = transactions.filter((t) => {
        const d = new Date(t.date);
        return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
      });

      // Helper to calculate totals
      const getTotals = (ts: Transaction[]) => {
        const income = ts
          .filter((t) => t.type === "income")
          .reduce((acc, t) => acc + t.amount, 0);
        const expense = ts
          .filter((t) => t.type === "expense")
          .reduce((acc, t) => acc + t.amount, 0);
        return { income, expense, net: income - expense };
      };

      const current = getTotals(thisMonthTransactions);
      const prev = getTotals(prevMonthTransactions);

      // Calculate Percentage Trends
      const calcTrend = (curr: number, p: number) => {
        if (p === 0) return curr > 0 ? 100 : 0;
        return ((curr - p) / p) * 100;
      };

      const expTrend = calcTrend(current.expense, prev.expense);
      const flowTrend = calcTrend(current.net, prev.net);

      // Generate Dynamic Insights
      const generatedInsights = [];

      // Insight 1: Income Growth
      const incomeTrend = calcTrend(current.income, prev.income);
      if (incomeTrend !== 0) {
        generatedInsights.push({
          icon: (
            <Ionicons
              name={incomeTrend > 0 ? "trending-up" : "trending-down"}
              size={28}
              color={incomeTrend > 0 ? "#16a34a" : "#dc2626"}
            />
          ),
          text: `Your income ${incomeTrend > 0 ? "increased" : "decreased"} by ${Math.abs(incomeTrend).toFixed(0)}% this month.`,
        });
      }

      // Insight 2: Top Spending Category
      if (categorySpending.length > 0) {
        const topCat = [...categorySpending].sort(
          (a, b) => b.amount - a.amount
        )[0];
        generatedInsights.push({
          icon: (
            <MaterialCommunityIcons name="finance" size={28} color="#6B7280" />
          ),
          text: `Most of your money ($${topCat.amount.toFixed(0)}) went to ${topCat.name}.`,
        });
      }

      return {
        currentMonthExpense: current.expense,
        expenseTrend: expTrend,
        cashFlowTrend: flowTrend,
        dynamicInsights: generatedInsights.slice(0, 2), // Keep top 2
      };
    }, [transactions, categorySpending]);

  const { yMin, yMax } = useMemo(() => {
    // 1. Extract all numeric values into a single array
    const values = chartData.flatMap((d) => [d.income, d.expense]);

    // 2. Handle empty state (if no transactions yet)
    if (values.length === 0) {
      return { yMin: 0, yMax: 500 };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      // Add a 15% buffer so the bars don't touch the very top/bottom of the frame
      yMin: min === 0 ? 0 : min * 0.9,
      yMax: max * 1.15,
    };
  }, [chartData]);

  return (
    <View>
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
                <Text style={styles.cashFlowTrendText}>
                  {Math.abs(cashFlowTrend).toFixed(0)}%
                </Text>
              </View>
            </View>
            <Text style={styles.cardValue}>${netCashFlow.toFixed(2)}</Text>
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
                <Text style={styles.expensesTrendText}>
                  {Math.abs(expenseTrend).toFixed(0)}%
                </Text>
              </View>
            </View>
            <Text style={styles.cardValue}>
              ${currentMonthExpense.toFixed(2)}
            </Text>
            <Text style={styles.cardLabel}>This Month Expenses</Text>
          </View>
        </View>

        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Monthly Cash Flow</Text>
          <CartesianChart
            data={filteredChartData}
            xKey="month"
            yKeys={["income", "expense"]}
            domain={{
              y: [yMin, yMax],
            }}
            domainPadding={{ left: 40, right: 40 }}
            axisOptions={{
              font,
              formatXLabel: (value) => {
                // Find the data point for this month
                const monthData = chartData.find((d) => d.month === value);

                // Only return the label if there is non-zero data
                const hasData =
                  monthData && (monthData.income > 0 || monthData.expense > 0);

                return hasData ? value : "";
              },
              // Set tickCount to the length of your data to ensure
              // the chart evaluates every single month point
              tickCount: chartData.length,
              lineColor: {
                grid: { x: "rgba(0,0,0,0)", y: "#e5e7eb" },
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
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => router.push("/transactions")}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentTransactions.length > 0 ? (
            recentTransactions.map((item) => (
              <TouchableOpacity
                key={item.emailId}
                style={styles.transactionItem}
                onPress={() => handleEditTransaction(item)}
              >
                {/* Left: Category Indicator & Info */}
                <View style={styles.transactionLeft}>
                  <View
                    style={[
                      styles.categoryDot,
                      { backgroundColor: colorMap[item.category] || "#6B7280" },
                    ]}
                  />
                  <View>
                    <Text style={styles.merchantName} numberOfLines={1}>
                      {item.merchant || "Unknown Merchant"}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {new Date(item.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                  </View>
                </View>

                {/* Right: Amount & Currency */}
                <View style={styles.transactionRight}>
                  <Text
                    style={[styles.transactionAmount, { color: "#111827" }]}
                  >
                    {item.type === "income" ? "+" : "-"}{" "}
                    {item.amount.toFixed(2)}
                  </Text>
                  <Text style={styles.transactionCurrency}>
                    {item.currency}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>No transactions recorded yet.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Spending by Category</Text>
          {categorySpending.map((cat) => (
            <View key={cat.name} style={styles.categoryRow}>
              <View
                style={[styles.categoryColor, { backgroundColor: cat.color }]}
              />
              <Text style={styles.categoryName}>{cat.name}</Text>
              <Text style={styles.categoryAmount}>
                ${cat.amount.toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Recent Insights</Text>
          {dynamicInsights.length > 0 ? (
            dynamicInsights.map((item, index) => (
              <View key={index} style={styles.insightRow}>
                {item.icon}
                <Text style={styles.insightText}>{item.text}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.insightText}>
              Sync more data to see insights.
            </Text>
          )}
        </View>
        {/* Transaction Dialog */}
        <TransactionDialog
          visible={transactionDialogVisible}
          onClose={() => setTransactionDialogVisible(false)}
          transactionToEdit={editingTransaction}
        />
      </ScrollView>
      <TouchableOpacity style={styles.fab} onPress={handleAddTransaction}>
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
    </View>
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  viewAllText: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "600",
  },
  transactionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  transactionLeft: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "75%",
    flex: 1,
    gap: 12,
  },
  transactionRight: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  merchantName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#111827",
    maxWidth: "100%",
  },
  transactionDate: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "600",
  },
  transactionCurrency: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
  },
  emptyText: {
    textAlign: "center",
    color: "#9CA3AF",
    marginVertical: 20,
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
  fab: {
    position: "absolute",
    bottom: 30,
    right: 30,
    backgroundColor: "#2563EB",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  typeToggle: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 15,
  },
  typeBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  activeIncome: { backgroundColor: "#dcfce7", borderColor: "#16a34a" },
  activeExpense: { backgroundColor: "#FEE2E2", borderColor: "#dc2626" },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: { padding: 12 },
  saveBtn: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
});
