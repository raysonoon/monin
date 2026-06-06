import { useState, useMemo, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { db } from "../../db/client";
import {
  transactions as transactionsSchema,
  Transaction,
  providers as providersSchema,
  categories as categoriesSchema,
  wallets as walletsSchema,
} from "../../db/schema";
import Feather from "@expo/vector-icons/Feather";
import { DateType } from "react-native-ui-datepicker";
import FilterDialog from "../components/FilterDialog";
import DateDialog from "../components/DateDialog";
import TransactionDialog from "../components/TransactionDialog";
import {
  getCategoryColorMap,
  getWalletSummary,
} from "../services/transaction/transactionHelper";

export const TransactionsScreen = () => {
  const scrollRef = useRef<any>(null);

  const { data: wallets = [] } = useLiveQuery(db.select().from(walletsSchema));
  const { data: providers = [] } = useLiveQuery(
    db.select().from(providersSchema)
  );
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

  // --- State for filter dialog ---
  const [isFilterDialogVisible, setIsFilterDialogVisible] = useState(false);

  // --- State for filters ---
  const [selectedWallet, setSelectedWallet] = useState("All");
  const [selectedProvider, setSelectedProvider] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // --- State for search ---
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // --- State for filter chips ---
  const [selectedType, setSelectedType] = useState("All");
  const [selectedCurrency, setSelectedCurrency] = useState("All");

  // --- State for pagination ---
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

  // Type chips
  const types = useMemo(() => {
    const unique = Array.from(new Set(transactions.map((t) => t.type)));
    return ["All", ...unique];
  }, [transactions]);

  // Currency chips
  const currencies = useMemo(() => {
    const unique = Array.from(new Set(transactions.map((t) => t.currency)));
    return ["All", ...unique];
  }, [transactions]);

  // --- Filter Logic ---
  const filteredData = useMemo(() => {
    return transactions
      .filter((t) => {
        const matchesSearch =
          t.merchant.toLowerCase().includes(search.toLowerCase()) ||
          (t.notes || "").toLowerCase().includes(search.toLowerCase());
        const matchesWallet =
          selectedWallet === "All" || String(t.walletId) === selectedWallet;
        const matchesProvider =
          selectedProvider === "All" ||
          String(t.providerId) === selectedProvider;
        const matchesCat =
          selectedCategory === "All" || t.category === selectedCategory;
        const matchesType = selectedType === "All" || t.type === selectedType;
        const matchesCurrency =
          selectedCurrency === "All" || t.currency === selectedCurrency;
        const matchesDate = inRange(t.date, range);

        return (
          matchesWallet &&
          matchesProvider &&
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
    selectedProvider,
    selectedCategory,
    selectedType,
    selectedCurrency,
    inRange,
    range,
  ]);

  // --- Pagination Logic ---
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  // --- Summary Totals ---
  const totalTransactions = filteredData.length;

  const totalIncome = filteredData
    .filter((t) => t.type === "income" && t.baseAmount)
    .reduce((sum, t) => sum + t.baseAmount, 0);

  const totalExpense = filteredData
    .filter((t) => t.type === "expense" && t.baseAmount)
    .reduce((sum, t) => sum + t.baseAmount, 0);

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    selectedCategory,
    selectedType,
    selectedCurrency,
    selectedWallet,
    selectedProvider,
    range,
  ]);

  return (
    <View style={styles.screen}>
      <KeyboardAwareScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="never"
        extraScrollHeight={100}
        enableResetScrollToCoords={false}
      >
        <Text style={styles.header}>Transactions</Text>
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={styles.card}>
            <Text style={styles.cardValue}>{totalTransactions}</Text>
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
        {/* Search Bar */}
        <View style={styles.searchRow}>
          {/* <Text style={styles.sectionTitle}>Search</Text> */}
          <TextInput
            style={styles.searchInput}
            placeholder="Search merchant or notes..."
            placeholderTextColor="#9ca3af"
            value={searchInput}
            onChangeText={setSearchInput}
            onEndEditing={() => setSearch(searchInput)}
            onBlur={() => setSearch(searchInput)}
            onFocus={(event) => {
              if (scrollRef.current) {
                scrollRef.current.scrollToFocusedInput(event.target);
              }
            }}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={styles.filterIconButton}
            onPress={() => setIsFilterDialogVisible(true)}
          >
            <Feather name="sliders" size={18} color="#111827" />
          </TouchableOpacity>
        </View>
        {/* Date Filter */}
        <View style={styles.filterGroup}>
          <TouchableOpacity
            onPress={() => {
              setIsDateDialogVisible(true);
            }}
          >
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
      </KeyboardAwareScrollView>
      <FilterDialog
        visible={isFilterDialogVisible}
        onClose={() => setIsFilterDialogVisible(false)}
        onApply={({ type, wallet, provider, category }) => {
          setSelectedType(type);
          setSelectedWallet(wallet);
          setSelectedProvider(provider);
          setSelectedCategory(category);
        }}
        initialType={selectedType}
        initialWallet={selectedWallet}
        initialProvider={selectedProvider}
        initialCategory={selectedCategory}
        types={types}
        wallets={wallets}
        providers={providers}
        categories={categories}
      />
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
  screen: {
    flex: 1,
    backgroundColor: "#fff",
  },
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
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  filterIconButton: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  filterGroup: {
    marginBottom: 10,
  },
  dateInput: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 12,
    fontSize: 16,
    color: "#1f2937",
  },
  searchInput: {
    backgroundColor: "#f3f4f6",
    flex: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 12,
    fontSize: 16,
    color: "#1f2937",
  },
  tableCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 15,
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
