import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { useState, useEffect, useMemo } from "react";
import { useGmail } from "../hooks/useGmail";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import {
  providers as providersSchema,
  Provider,
  categories as categoriesSchema,
  Category,
  wallets as walletsSchema,
  Wallet,
  categorizationRules as catRulesSchema,
  CategorizationRule,
  transactions as transactionsSchema,
} from "../../db/schema";
import ProviderDialog from "../components/ProviderDialog";
import CategoryDialog from "../components/CategoryDialog";
import MerchantDialog from "../components/MerchantDialog";
import WalletDialog from "../components/WalletDialog";
import { getGeneralWalletId } from "../../db/seed";
import { getWalletSummary } from "../services/transaction/transactionHelper";
import Feather from "@expo/vector-icons/Feather";

export const SettingsScreen = () => {
  const {
    user,
    signIn,
    signOut,
    isLoading,
    emailData,
    fullSyncEmails,
    isSyncing,
    syncError,
    authStatusMessage,
  } = useGmail();

  // Provider dialog state
  const [providerDialogVisible, setProviderDialogVisible] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);

  // Category dialog state
  const [categoryDialogVisible, setCategoryDialogVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Merchant dialog state
  const [merchantDialogVisible, setMerchantDialogVisible] = useState(false);
  const [editingMerchant, setEditingMerchant] =
    useState<CategorizationRule | null>(null);

  // Wallet dialog state
  const [walletDialogVisible, setWalletDialogVisible] = useState(false);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [generalWalletId, setGeneralWalletId] = useState<number | null>(null);

  // Handlers
  const handleAddProvider = () => {
    setEditingProvider(null); // Clear data for "Add Mode"
    setProviderDialogVisible(true);
  };

  const handleEditProvider = (prov: Provider) => {
    setEditingProvider(prov); // Set data for "Edit Mode"
    setProviderDialogVisible(true);
  };

  const handleAddCategory = () => {
    setEditingCategory(null); // Clear data for "Add Mode"
    setCategoryDialogVisible(true);
  };

  const handleEditCategory = (cat: Category) => {
    setEditingCategory(cat); // Set data for "Edit Mode"
    setCategoryDialogVisible(true);
  };

  const handleAddMerchant = () => {
    setEditingMerchant(null); // Clear data for "Add Mode"
    setMerchantDialogVisible(true);
  };

  const handleEditMerchant = (catRule: CategorizationRule) => {
    setEditingMerchant(catRule); // Set data for "Edit Mode"
    setMerchantDialogVisible(true);
  };

  const handleAddWallet = () => {
    setEditingWallet(null);
    setWalletDialogVisible(true);
  };

  const handleEditWallet = (wallet: Wallet) => {
    setEditingWallet(wallet);
    setWalletDialogVisible(true);
  };

  const handleDeleteWallet = async (wallet: Wallet) => {
    if (generalWalletId !== null && wallet.id === generalWalletId) {
      Alert.alert("Not allowed", "You cannot delete the General wallet.");
      return;
    }

    const linkedTransactions = await db
      .select({ id: transactionsSchema.id })
      .from(transactionsSchema)
      .where(eq(transactionsSchema.walletId, wallet.id))
      .limit(1);

    if (linkedTransactions.length > 0) {
      Alert.alert(
        "Wallet in use",
        "Move or delete the linked transactions before deleting this wallet."
      );
      return;
    }

    Alert.alert("Delete Wallet", `Delete ${wallet.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await db
              .delete(walletsSchema)
              .where(eq(walletsSchema.id, wallet.id));
          } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to delete wallet.");
          }
        },
      },
    ]);
  };

  const { data: providers } = useLiveQuery(
    db.select().from(providersSchema), // providersSchema refers to table definition, while categories is actual data from DB
    []
  );

  const { data: wallets = [] } = useLiveQuery(
    db.select().from(walletsSchema),
    []
  );

  const { data: transactions = [] } = useLiveQuery(
    db.select().from(transactionsSchema),
    []
  );

  const latestSyncedTransaction = useMemo(() => {
    return (
      [...transactions].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0] ?? null
    );
  }, [transactions]);

  const renderSyncPreview = () => {
    if (!latestSyncedTransaction) {
      return (
        <View style={styles.emptyPreview}>
          <Feather name="info" size={16} color="#9ca3af" />
          <Text style={styles.emptyPreviewText}>
            No recent sync data found.
          </Text>
        </View>
      );
    }

    // Assuming emailData contains: merchant, amount, date, currency
    return (
      <View style={styles.syncCard}>
        <View style={styles.syncCardRow}>
          <View>
            <Text style={styles.syncMerchant}>
              {latestSyncedTransaction.merchant || "Unknown Merchant"}
            </Text>
            <Text style={styles.syncDate}>
              {new Date(latestSyncedTransaction.date).toLocaleDateString(
                undefined,
                {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }
              )}
            </Text>
          </View>
          <View style={styles.syncAmountContainer}>
            <Text style={styles.syncAmount}>
              {latestSyncedTransaction.currency}{" "}
              {latestSyncedTransaction.amount?.toFixed(2)}
            </Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Success</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  useEffect(() => {
    console.log("Providers updated in UI:", providers?.length);
  }, [providers]);

  const { data: categories } = useLiveQuery(
    db.select().from(categoriesSchema), // categoriesSchema refers to table definition, while categories is actual data from DB
    []
  );

  useEffect(() => {
    console.log("Categories updated in UI:", categories?.length);
  }, [categories]);

  const { data: categorizationRules } = useLiveQuery(
    db.select().from(catRulesSchema), // catRulesSchema refers to table definition for categorization rules
    []
  );

  useEffect(() => {
    getGeneralWalletId()
      .then(setGeneralWalletId)
      .catch((error) => {
        console.error("Failed to resolve General wallet:", error);
      });
  }, []);

  useEffect(() => {
    console.log(
      "Categorization rules updated in UI:",
      categorizationRules?.length
    );
  }, [categorizationRules]);

  // Optional: Loading state (though local DB is usually instant)
  if (!categories || !categorizationRules)
    return (
      <View>
        <Text>Loading...</Text>
      </View>
    );

  return (
    <ScrollView
      style={{ padding: 20, backgroundColor: "#f4f4f4" }}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Gmail Connection */}
      <View style={styles.section}>
        <Text style={styles.title}>Gmail Connection</Text>
        <Text>{user ? `${user.email} connected` : "No email connected"}</Text>
        {!user && authStatusMessage ? (
          <View style={styles.sessionBanner}>
            <Feather name="alert-circle" size={14} color="#92400e" />
            <Text style={styles.sessionBannerText}>{authStatusMessage}</Text>
          </View>
        ) : null}
        {user ? (
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: "#dc2626", marginTop: 15 },
              isLoading && styles.buttonDisabled,
            ]}
            onPress={() => {
              console.log("Signing out from gmail");
              signOut();
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Disconnect Gmail</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.button,
              { marginTop: 15 },
              isLoading && styles.buttonDisabled,
            ]}
            onPress={() => {
              console.log("Signing in to gmail");
              signIn();
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Connect your Gmail</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Recover Transactions */}
      <View style={styles.section}>
        <Text style={styles.title}>Recover Transactions</Text>
        <Text style={styles.subtitle}>
          Sync all emails to recover lost transactions
        </Text>
        {syncError ? (
          <View style={styles.sessionBanner}>
            <Feather name="alert-circle" size={14} color="#92400e" />
            <Text style={styles.sessionBannerText}>{syncError}</Text>
          </View>
        ) : null}
        <View>
          <TouchableOpacity
            style={[
              styles.button,
              { marginTop: 5 },
              (isSyncing || !user) && styles.buttonDisabled,
            ]}
            onPress={fullSyncEmails}
            disabled={isSyncing || !user}
          >
            {isSyncing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {user ? "Run Full Sync" : "Connect Gmail to Sync"}
              </Text>
            )}
          </TouchableOpacity>
          <Text style={[styles.subtitle, { marginTop: 15 }]}>
            Last sync transaction:
          </Text>
          {renderSyncPreview()}
        </View>
      </View>

      {/* Import Transactions */}
      <View style={styles.section}>
        <Text style={styles.title}>Import Transactions</Text>
        <Text style={styles.subtitle}>Import transaction .json file</Text>
      </View>

      {/* Wallets */}
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Wallets</Text>
            <Text style={styles.subtitle}>
              Manage different wallets with separate balances.
            </Text>
          </View>
          <TouchableOpacity style={styles.button} onPress={handleAddWallet}>
            <Feather name="plus" size={16} color="white" />
            <Text style={styles.buttonText}>Add Wallet</Text>
          </TouchableOpacity>
        </View>

        {wallets.map((wallet) => {
          const isDefaultWallet =
            generalWalletId !== null && wallet.id === generalWalletId;

          const walletTransactions = transactions.filter(
            (transaction) => transaction.walletId === wallet.id
          );

          const summary = getWalletSummary(walletTransactions, wallet);

          return (
            <View key={wallet.id} style={styles.walletBox}>
              <View style={styles.walletLeft}>
                <View>
                  <View style={styles.walletTitleRow}>
                    <Text style={styles.categoryName}>{wallet.name}</Text>
                    {isDefaultWallet ? (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Default</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.walletMeta}>
                    {wallet.currency} ({wallet.type})
                  </Text>
                  <Text style={styles.walletMeta}>
                    Balance: {summary.currency} {summary.balance.toFixed(2)}
                  </Text>
                  {wallet.description ? (
                    <Text style={styles.walletDescription}>
                      {wallet.description}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.walletActions}>
                <TouchableOpacity onPress={() => handleEditWallet(wallet)}>
                  <Feather name="edit-2" size={20} color="black" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeleteWallet(wallet)}
                  disabled={isDefaultWallet}
                  style={isDefaultWallet ? { opacity: 0.35 } : undefined}
                >
                  <Feather name="trash-2" size={20} color="#dc2626" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>

      <WalletDialog
        visible={walletDialogVisible}
        onClose={() => setWalletDialogVisible(false)}
        walletToEdit={editingWallet}
      />

      {/* Payment Providers */}
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Payment Providers</Text>
            <Text style={styles.subtitle}>
              Enable transaction tracking from supported payment providers
            </Text>
          </View>
          <TouchableOpacity style={styles.button} onPress={handleAddProvider}>
            <Feather name="plus" size={16} color="white" />
            <Text style={styles.buttonText}>Add Provider</Text>
          </TouchableOpacity>
        </View>

        {providers.map((provider) => (
          <View key={provider.name} style={styles.categoryBox}>
            <View style={styles.providerContainer}>
              <View style={styles.providerIcon}>
                <Image
                  style={styles.image}
                  source={{ uri: provider.icon }}
                  contentFit="cover"
                />
              </View>
              <View style={styles.providerText}>
                <Text style={styles.categoryName}>{provider.name}</Text>
                <Text>{provider.description}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => handleEditProvider(provider)}>
              <Feather name="edit-2" size={20} color="black" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Provider Dialog */}
      <ProviderDialog
        visible={providerDialogVisible}
        onClose={() => setProviderDialogVisible(false)}
        providerToEdit={editingProvider}
      />

      <View style={styles.section}>
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Categories</Text>
            <Text style={styles.subtitle}>
              Create and manage expense categories
            </Text>
          </View>
          <TouchableOpacity style={styles.button}>
            <Feather name="plus" size={16} color="white" />
            <Text style={styles.buttonText} onPress={handleAddCategory}>
              Add Category
            </Text>
          </TouchableOpacity>
        </View>
        {categories.map((cat) => (
          <View key={cat.name} style={styles.categoryBox}>
            <View
              style={[
                styles.categoryColor,
                { backgroundColor: cat.color ?? "#ccc" },
              ]}
            />
            <Text style={styles.categoryName}>{cat.name}</Text>
            <TouchableOpacity onPress={() => handleEditCategory(cat)}>
              <Feather name="edit-2" size={20} color="black" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Category Dialog */}
      <CategoryDialog
        visible={categoryDialogVisible}
        onClose={() => setCategoryDialogVisible(false)}
        categoryToEdit={editingCategory}
      />

      <View style={styles.section}>
        <View style={styles.headerRow}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Merchants</Text>
            <Text style={styles.subtitle}>
              Configure merchant categorization rules for automatic expense
              tracking
            </Text>
          </View>
          <TouchableOpacity style={styles.button} onPress={handleAddMerchant}>
            <Feather name="plus" size={16} color="white" />
            <Text style={styles.buttonText}>Add Rule</Text>
          </TouchableOpacity>
        </View>
        {categorizationRules.map((merchant) => {
          const category = categories.find(
            (cat) => cat.id === merchant.categoryId
          );
          return (
            <View key={merchant.keyword} style={styles.categoryBox}>
              <View style={styles.merchantContainer}>
                <Text style={styles.categoryName}>{merchant.keyword}</Text>
                {/* Category Subtitle */}
                <Text style={styles.subtitle}>
                  {category ? category.name : "Uncategorized"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleEditMerchant(merchant)}>
                <Feather name="edit-2" size={20} color="black" />
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {/* Merchant Dialog */}
      <MerchantDialog
        visible={merchantDialogVisible}
        onClose={() => setMerchantDialogVisible(false)}
        merchantToEdit={editingMerchant}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  section: {
    padding: 15,
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#717182",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start", // Align items to top to handle multi-line subtitles
    marginTop: 8,
    marginBottom: 20,
  },
  titleContainer: {
    flex: 1, // Takes up remaining space
    marginRight: 10,
  },
  sessionBanner: {
    marginTop: 10,
    backgroundColor: "#fef3c7",
    borderColor: "#fde68a",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sessionBannerText: {
    color: "#92400e",
    fontSize: 13,
    flex: 1,
  },
  emptyPreview: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    gap: 8,
    backgroundColor: "#f9fafb",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
  },
  emptyPreviewText: {
    color: "#6b7280",
    fontSize: 14,
  },
  syncCard: {
    backgroundColor: "#f8fafc",
    marginTop: 5,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  syncCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  syncMerchant: {
    fontSize: 16,
    fontWeight: "400",
    fontStyle: "italic",
    color: "#1e293b",
    marginBottom: 4,
  },
  syncDate: {
    fontSize: 12,
    color: "#64748b",
  },
  syncAmountContainer: {
    alignItems: "flex-end",
  },
  syncAmount: {
    fontSize: 16,
    fontWeight: "400",
    color: "#0f172a",
  },
  statusBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
    marginTop: 4,
  },
  statusText: {
    color: "#166534",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  errorText: {
    color: "#dc2626",
    marginBottom: 10,
    fontSize: 14,
  },
  providerIcon: {
    width: 30,
    height: 30,
    borderRadius: 2,
    marginRight: 16,
  },
  image: {
    flex: 1,
  },
  providerText: {
    flexDirection: "column",
  },
  providerContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryBox: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#9d9da5ff",
  },
  walletBox: {
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#9d9da5ff",
  },
  walletLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  walletTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  defaultBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  defaultBadgeText: {
    color: "#166534",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  walletMeta: {
    color: "#6b7280",
    fontSize: 13,
    marginTop: 2,
  },
  walletDescription: {
    color: "#374151",
    fontSize: 13,
    marginTop: 4,
  },
  walletActions: {
    flexDirection: "row",
    gap: 12,
  },
  categoryColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 10,
  },
  categoryName: {
    fontSize: 16,
  },
  merchantContainer: {
    flexDirection: "column",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginTop: 5,
  },
  button: {
    backgroundColor: "#000000ff",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
});
