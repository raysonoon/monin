import { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { db } from "../../db/client";
import {
  transactions as transactionsSchema,
  Transaction,
  categories as categoriesSchema,
} from "../../db/schema";
import TransactionDialog from "../components/TransactionDialog";
import { getCategoryColorMap } from "../services/transaction/transactionHelper";

export const TransactionsScreen = () => {
  const { data: transactions = [] } = useLiveQuery(
    db.select().from(transactionsSchema)
  );
  const { data: categories = [] } = useLiveQuery(
    db.select().from(categoriesSchema)
  );

  const [isDialogVisible, setIsDialogVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  const handleEditPress = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsDialogVisible(true);
  };

  const handleCloseDialog = () => {
    setIsDialogVisible(false);
    setSelectedTransaction(null);
  };

  // --- State for Filters ---
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedType, setSelectedType] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const colorMap = useMemo(() => getCategoryColorMap(categories), [categories]);

  // --- 1. Filter Logic ---
  const filteredData = useMemo(() => {
    return transactions
      .filter((t) => {
        const matchesSearch =
          t.merchant.toLowerCase().includes(search.toLowerCase()) ||
          t.category.toLowerCase().includes(search.toLowerCase());
        const matchesCat =
          selectedCategory === "All" || t.category === selectedCategory;
        const matchesType = selectedType === "All" || t.type === selectedType;

        return matchesSearch && matchesCat && matchesType;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, search, selectedCategory, selectedType]);

  // --- 2. Pagination Logic ---
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  // --- 3. Summary Totals ---
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);

  return (
    <View>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={styles.card}>
            <Text style={styles.cardValue}>{transactions.length}</Text>
            <Text style={styles.cardLabel}>Total Transactions</Text>
          </View>
          <View style={styles.card}>
            <Text
              style={[styles.cardValue, { color: "#16a34a" }]}
            >{`$${totalIncome.toFixed(2)}`}</Text>
            <Text style={styles.cardLabel}>Total Income</Text>
          </View>
          <View style={styles.card}>
            <Text
              style={[styles.cardValue, { color: "#dc2626" }]}
            >{`$${totalExpense.toFixed(2)}`}</Text>
            <Text style={styles.cardLabel}>Total Expenses</Text>
          </View>
        </View>

        {/* Filter Bar */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Search</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search merchant or category..."
            placeholderTextColor="#9ca3af"
            onChangeText={setSearch}
          />
        </View>

        {/* Transactions Table */}
        <View style={styles.tableCard}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerText, { flex: 2 }]}>Merchant</Text>
            <Text style={[styles.headerText, { flex: 1 }]}>Category</Text>
            <Text style={[styles.headerText, { flex: 1, textAlign: "right" }]}>
              Amount
            </Text>
          </View>

          {paginatedData.map((item) => (
            <TouchableOpacity
              key={item.emailId}
              style={styles.tableRow}
              onPress={() => handleEditPress(item)} // Trigger edit on click
            >
              <View style={{ flex: 2 }}>
                <Text style={styles.merchantText}>{item.merchant}</Text>
                <Text style={styles.dateText}>
                  {new Date(item.date).toLocaleDateString(undefined, {
                    year: "2-digit",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: colorMap[item.category] + "20" },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: colorMap[item.category] },
                    ]}
                  >
                    {item.category}
                  </Text>
                </View>
              </View>

              <View style={styles.transactionRight}>
                <Text
                  style={[
                    styles.amountText,
                    {
                      color: item.type === "income" ? "#16a34a" : "#dc2626",
                    },
                  ]}
                >
                  {item.type === "income" ? "+" : "-"} {item.amount.toFixed(2)}
                </Text>
                <Text style={styles.transactionCurrency}>{item.currency}</Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* Pagination Footer */}
          <View style={styles.paginationRow}>
            <TouchableOpacity
              disabled={currentPage === 1}
              onPress={() => setCurrentPage((p) => p - 1)}
            >
              <Text
                style={
                  currentPage === 1 ? styles.disabledPrev : styles.activePrev
                }
              >
                Previous
              </Text>
            </TouchableOpacity>

            <Text>
              Page {currentPage} of {totalPages || 1}
            </Text>

            <TouchableOpacity
              disabled={currentPage === totalPages}
              onPress={() => setCurrentPage((p) => p + 1)}
            >
              <Text
                style={
                  currentPage === totalPages
                    ? styles.disabledNext
                    : styles.activeNext
                }
              >
                Next
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <TransactionDialog
        visible={isDialogVisible}
        onClose={handleCloseDialog}
        transactionToEdit={selectedTransaction}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: "#fff",
  },
  summaryRow: { flexDirection: "row", gap: 12 },
  card: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 12,
    marginBottom: 15,
    borderRadius: 12,
    elevation: 3,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: "600",
  },
  cardLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },
  searchInput: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: "#1f2937",
    marginBottom: 20,
  },
  tableCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: "row",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F9FAFB",
  },
  merchantText: { fontSize: 14, fontWeight: "500", color: "#111827" },
  dateText: { fontSize: 12, color: "#9CA3AF" },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 10, fontWeight: "600" },
  amountText: { fontSize: 14, fontWeight: "700", textAlign: "right" },
  transactionRight: {
    flexDirection: "column",
    alignItems: "flex-end",
    flex: 1,
  },
  transactionCurrency: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
    textAlign: "right",
  },
  paginationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  activePrev: {
    fontWeight: "600",
  },
  disabledPrev: {
    color: "#d1d5db",
    opacity: 0.5,
  },
  activeNext: {
    fontWeight: "600",
  },
  disabledNext: {
    color: "#d1d5db",
    opacity: 0.5,
  },
});
