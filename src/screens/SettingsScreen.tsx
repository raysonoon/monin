import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import { useState, useEffect } from "react";
import { useGmail } from "../hooks/useGmail";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { db } from "../../db/client";
import {
  providers as providersSchema,
  Provider,
  categories as categoriesSchema,
  Category,
  categorizationRules as catRulesSchema,
  CategorizationRule,
} from "../../db/schema";
import ProviderDialog from "../components/ProviderDialog";
import CategoryDialog from "../components/CategoryDialog";
import MerchantDialog from "../components/MerchantDialog";
import Feather from "@expo/vector-icons/Feather";

export const SettingsScreen = () => {
  const {
    user,
    signIn,
    signOut,
    isLoading,
    paylahEmailData,
    listPaylahEmails,
    isSyncing,
    syncError,
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

  const { data: providers } = useLiveQuery(
    db.select().from(providersSchema), // providersSchema refers to table definition, while categories is actual data from DB
    []
  );

  const renderSyncPreview = () => {
    if (!paylahEmailData) {
      return (
        <View style={styles.emptyPreview}>
          <Feather name="info" size={16} color="#9ca3af" />
          <Text style={styles.emptyPreviewText}>
            No recent sync data found.
          </Text>
        </View>
      );
    }

    // Assuming paylahEmailData contains: merchant, amount, date, currency
    return (
      <View style={styles.syncCard}>
        <View style={styles.syncCardRow}>
          <View>
            <Text style={styles.syncMerchant}>
              {paylahEmailData.merchant || "Unknown Merchant"}
            </Text>
            <Text style={styles.syncDate}>
              {paylahEmailData.date
                ? new Date(paylahEmailData.date).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })
                : "No date found"}
            </Text>
          </View>
          <View style={styles.syncAmountContainer}>
            <Text style={styles.syncAmount}>
              {paylahEmailData.currency} {paylahEmailData.amount?.toFixed(2)}
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

        {user ? (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#dc2626" }]}
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
            style={styles.button}
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

      {/* Last Synced Transaction */}
      <View style={styles.section}>
        <Text style={styles.title}>Last Synced Transaction</Text>
        {syncError && <Text style={{ color: "red" }}>Error: {syncError}</Text>}
        <View style={styles.section}>
          {/* The new friendly UI */}
          {renderSyncPreview()}

          <TouchableOpacity
            style={[styles.button, { marginTop: 15 }]}
            onPress={listPaylahEmails}
            disabled={isSyncing || !user}
          >
            {isSyncing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {user ? "Run Full Sync Test" : "Connect Gmail to Run Test"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

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
  emptyPreview: {
    flexDirection: "row",
    alignItems: "center",
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
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
});
