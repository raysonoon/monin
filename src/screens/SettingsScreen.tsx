import {
  View,
  Text,
  Switch,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useState, useEffect } from "react";
import { useAuth } from "../context/auth";
import { useGmail } from "../hooks/useGmail";
import { BASE_URL } from "../../utils/constants";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { db } from "../../db/client";
import {
  categories as categoriesSchema,
  Category,
  categorizationRules as catRulesSchema,
  CategorizationRule,
} from "../../db/schema";
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

  const { fetchWithAuth } = useAuth();

  const [data, setData] = useState();

  // Category dialog state
  const [categoryDialogVisible, setCategoryDialogVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Merchant dialog state
  const [merchantDialogVisible, setMerchantDialogVisible] = useState(false);
  const [editingMerchant, setEditingMerchant] =
    useState<CategorizationRule | null>(null);

  const [autoSync, setAutoSync] = useState(true);
  const [skipDuplicates, setSkipDuplicates] = useState(false);
  const [manualApproval, setManualApproval] = useState(true);

  // Handlers
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

  // Dummy data
  const paymentProviders = [
    { name: "PayLah!", description: "DBS digital wallet" },
    { name: "YouTrip", description: "Multi-currency wallet" },
    { name: "Revolut", description: "Multi-currency wallet" },
  ];

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

  const getProtectedData = async () => {
    const response = await fetchWithAuth(`${BASE_URL}/api/protected/data`, {
      method: "GET",
    });

    const data = await response.json();
    setData(data);
  };

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

      {/* Protected Data */}
      <View style={styles.section}>
        <Text style={styles.title}>Protected Data</Text>
        <Text>{JSON.stringify(data)}</Text>
        <TouchableOpacity style={styles.button} onPress={getProtectedData}>
          <Text style={styles.buttonText}>Fetch protected data</Text>
        </TouchableOpacity>
      </View>

      {/* Last Synced Transaction */}
      <View style={styles.section}>
        <Text style={styles.title}>Last Synced Transaction</Text>
        {syncError && <Text style={{ color: "red" }}>Error: {syncError}</Text>}
        <Text>{JSON.stringify(paylahEmailData)}</Text>
        {/* Run Test */}
        <TouchableOpacity
          style={styles.button}
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

      {/* Sync Settings */}
      <View style={styles.section}>
        <Text style={styles.title}>Sync Settings</Text>

        <View style={styles.row}>
          <Text>Auto-sync new emails</Text>
          <Switch value={autoSync} onValueChange={setAutoSync} />
        </View>

        <Text style={{ marginTop: 10 }}>Sync frequency</Text>
        <TextInput placeholder="Every 15 minutes" style={styles.input} />

        <Text style={{ marginTop: 10 }}>Look back period</Text>
        <TextInput placeholder="Last 7 days" style={styles.input} />
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
          <TouchableOpacity style={styles.button}>
            <Feather name="plus" size={16} color="white" />
            <Text style={styles.buttonText}>Add Provider</Text>
          </TouchableOpacity>
        </View>

        {paymentProviders.map((provider) => (
          <View key={provider.name} style={styles.categoryBox}>
            <View style={styles.providerContainer}>
              <View
                style={[styles.providerIcon, { backgroundColor: "#ccc" }]}
              />
              <View style={styles.providerText}>
                <Text style={styles.categoryName}>{provider.name}</Text>
                <Text>{provider.description}</Text>
              </View>
            </View>
            <TouchableOpacity>
              <Feather name="edit-2" size={20} color="black" />
            </TouchableOpacity>
          </View>
        ))}
      </View>

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

      {/* Advanced Settings */}
      <View style={styles.section}>
        <Text style={styles.title}>Advanced Settings</Text>

        <Text>Custom email filters</Text>
        <TextInput placeholder="Enter keywords" style={styles.input} />

        <View style={styles.row}>
          <Text>Skip duplicate detection</Text>
          <Switch value={skipDuplicates} onValueChange={setSkipDuplicates} />
        </View>

        <View style={styles.row}>
          <Text>Require manual approval</Text>
          <Switch value={manualApproval} onValueChange={setManualApproval} />
        </View>
      </View>
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
  providerIcon: {
    width: 20,
    height: 20,
    borderRadius: 2,
    marginRight: 16,
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
    gap: 6,
    borderRadius: 8,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
});
