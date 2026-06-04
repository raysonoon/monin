import { useState, useMemo, useEffect } from "react";
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
  wallets as walletsSchema,
} from "../../db/schema";
import Feather from "@expo/vector-icons/Feather";
import { DateType } from "react-native-ui-datepicker";
import DateDialog from "../components/DateDialog";
import TransactionDialog from "../components/TransactionDialog";
import {
  getCategoryColorMap,
  getWalletSummary,
} from "../services/transaction/transactionHelper";

export const TransactionsScreen = () => {
  const { data: wallets = [] } = useLiveQuery(db.select().from(walletsSchema));
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

  // State for wallet dropdown ---
  const [selectedWallet, setSelectedWallet] = useState("All");
  const [isWalletOpen, setIsWalletOpen] = useState(false);

  const selectedWalletData =
    selectedWallet === "All"
      ? null
      : (wallets.find((wallet) => String(wallet.id) === selectedWallet) ??
        null);

  const selectedWalletTransactions =
    selectedWalletData === null
      ? transactions
      : transactions.filter(
          (transaction) => transaction.walletId === selectedWalletData.id
        );

  const walletSummary =
    selectedWalletData === null
      ? null
      : getWalletSummary(selectedWalletTransactions, selectedWalletData);

  // --- State for Filters ---
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedCurrency, setSelectedCurrency] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const colorMap = useMemo(() => getCategoryColorMap(categories), [categories]);

  // Date filter
  const [range, setRange] = useState<{
    startDate: DateType;
    endDate: DateType;
  }>({ startDate: undefined, endDate: undefined });

  const [isDateDialogVisible, setIsDateDialogVisible] = useState(false);

  const inRange = (
    dateIso: string,
    r: { startDate: DateType; endDate: DateType }
  ) => {
    if (!r.startDate || !r.endDate) return true;

    const tx = new Date(dateIso).getTime();
    const start = new Date(r.startDate as Date).setHours(0, 0, 0, 0);
    const end = new Date(r.endDate as Date).setHours(23, 59, 59, 999);

    return tx >= start && tx <= end;
  };
  // Currency chips
  const currencies = useMemo(() => {
    const unique = Array.from(new Set(transactions.map((t) => t.currency)));
    return ["All", ...unique];
  }, [transactions]);

  // --- 1. Filter Logic ---
  const filteredData = useMemo(() => {
    return transactions
      .filter((t) => {
        const matchesSearch =
          t.merchant.toLowerCase().includes(search.toLowerCase()) ||
          t.category.toLowerCase().includes(search.toLowerCase());
        const matchesWallet =
          selectedWallet === "All" || String(t.walletId) === selectedWallet;
        const matchesCat =
          selectedCategory === "All" || t.category === selectedCategory;
        const matchesType = selectedType === "All" || t.type === selectedType;
        const matchesCurrency =
          selectedCurrency === "All" || t.currency === selectedCurrency;
        const matchesDate = inRange(t.date, range);

        return (
          matchesWallet &&
          matchesSearch &&
          matchesCat &&
          matchesType &&
          matchesCurrency &&
          matchesDate
        );
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [
    transactions,
    search,
    selectedWallet,
    selectedCategory,
    selectedType,
    selectedCurrency,
    inRange,
    range,
  ]);

  // --- 2. Pagination Logic ---
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  // --- 3. Summary Totals ---
  const totalIncome = transactions
    .filter((t) => t.type === "income" && t.baseAmount)
    .reduce((s, t) => s + t.baseAmount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === "expense" && t.baseAmount)
    .reduce((s, t) => s + t.baseAmount, 0);

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    selectedCategory,
    selectedType,
    selectedCurrency,
    selectedWallet,
    range,
  ]);

  return (
    <View>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.header}>Transactions</Text>
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

        {/* Wallet Dropdown Filter */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Wallet</Text>

          <TouchableOpacity
            style={styles.dropdownTrigger}
            onPress={() => setIsWalletOpen((open) => !open)}
          >
            <Text style={styles.triggerText}>
              {selectedWallet === "All"
                ? "All Wallets"
                : (wallets.find((w) => String(w.id) === selectedWallet)?.name ??
                  "Wallet")}
            </Text>
            <Feather
              name={isWalletOpen ? "chevron-up" : "chevron-down"}
              size={16}
              color="#6b7280"
            />
          </TouchableOpacity>

          {isWalletOpen ? (
            <View style={styles.dropdownListContainer}>
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setSelectedWallet("All");
                  setIsWalletOpen(false);
                  setCurrentPage(1);
                }}
              >
                <Text style={styles.itemText}>All Wallets</Text>
              </TouchableOpacity>

              {wallets.map((wallet) => (
                <TouchableOpacity
                  key={wallet.id}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedWallet(String(wallet.id));
                    setIsWalletOpen(false);
                    setCurrentPage(1);
                  }}
                >
                  <Text style={styles.itemText}>{wallet.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
          {walletSummary ? (
            <View style={styles.summaryWallet}>
              <Text style={styles.summaryText}>
                Balance: {walletSummary.currency}{" "}
                {walletSummary.balance.toFixed(2)}
              </Text>
              <Text style={styles.summaryText}>
                Income: {walletSummary.currency}{" "}
                {walletSummary.income.toFixed(2)}
              </Text>
              <Text style={styles.summaryText}>
                Expense: {walletSummary.currency}{" "}
                {walletSummary.expense.toFixed(2)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Date Filter */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Date range</Text>
          <TouchableOpacity onPress={() => setIsDateDialogVisible(true)}>
            <TextInput
              style={styles.dateInput}
              value={
                range.startDate && range.endDate
                  ? `${new Date(range.startDate as Date).toLocaleDateString()} - ${new Date(range.endDate as Date).toLocaleDateString()}`
                  : ""
              }
              placeholder="Choose date range"
              placeholderTextColor="#9ca3af"
              editable={false}
            />
          </TouchableOpacity>
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

        {/* Currency */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterRow}>
            {currencies.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => {
                  setSelectedCurrency(c);
                  setCurrentPage(1);
                }}
                style={[
                  styles.filterChip,
                  c === selectedCurrency && styles.filterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    c === selectedCurrency && styles.filterChipTextActive,
                  ]}
                >
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

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

                {item.currency !== "SGD" && item.baseAmount ? (
                  <Text style={styles.transactionBaseAmount}>
                    SGD {item.baseAmount.toFixed(2)}
                  </Text>
                ) : null}
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
              disabled={currentPage >= totalPages}
              onPress={() => setCurrentPage((p) => p + 1)}
            >
              <Text
                style={
                  currentPage >= totalPages
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
      <DateDialog
        visible={isDateDialogVisible}
        value={range}
        onApply={setRange}
        onClose={() => setIsDateDialogVisible(false)}
        onClear={() => setRange({ startDate: undefined, endDate: undefined })}
      />
      <TransactionDialog
        visible={isDialogVisible}
        onClose={handleCloseDialog}
        transactionToEdit={selectedTransaction}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 20,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: "#fff",
  },
  summaryRow: { flexDirection: "row", gap: 12 },
  summaryWallet: {
    marginTop: 8,
  },
  summaryText: {
    fontSize: 14,
    color: "#374151",
    marginTop: 4,
  },
  dateContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  card: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 12,
    marginBottom: 15,
    borderRadius: 12,
    elevation: 3,
  },
  cardValue: {
    fontSize: 18,
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
  dropdownTrigger: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  triggerText: {
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "500",
  },
  dropdownListContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
    elevation: 3,
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  itemText: {
    fontSize: 14,
    color: "#374151",
  },
  dateInput: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: "#1f2937",
    marginBottom: 6,
  },
  searchInput: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: "#1f2937",
    marginBottom: 6,
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
  transactionBaseAmount: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
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
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
  },
  filterChipActive: {
    backgroundColor: "#111827",
  },
  filterChipText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#fff",
  },
});
