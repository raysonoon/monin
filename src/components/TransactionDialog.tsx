import { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  Alert,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { db } from "../../db/client";
import {
  transactions,
  Transaction,
  categories as categoriesSchema,
} from "../../db/schema";
import { eq } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import Feather from "@expo/vector-icons/Feather";

interface TransactionDialogProps {
  visible: boolean;
  onClose: () => void;
  transactionToEdit?: Transaction | null; // If null, we are in "Add" mode
}

const TYPE_OPTIONS = [
  { key: "expense", label: "Expense", icon: "💸" },
  { key: "income", label: "Income", icon: "💰" },
];

const CURRENCY_OPTIONS = ["SGD", "CAD", "USD", "EUR", "GBP", "JPY", "MYR"];

export default function TransactionDialog({
  visible,
  onClose,
  transactionToEdit,
}: TransactionDialogProps) {
  // Form States
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("SGD");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]); // YYYY-MM-DD
  const [notes, setNotes] = useState("");

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null
  );

  // Visibility states for dropdowns
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: categoryList } = useLiveQuery(
    db.select().from(categoriesSchema)
  );

  // Find the full object for the selected ID (so we can show icon/name)
  const selectedCategory = categoryList?.find(
    (c) => c.id === selectedCategoryId
  );

  // Reset or Populate form when dialog opens
  useEffect(() => {
    if (visible) {
      if (transactionToEdit) {
        // EDIT MODE
        setMerchant(transactionToEdit.merchant);
        setAmount(transactionToEdit.amount.toFixed(2));
        setCurrency(transactionToEdit.currency);
        setType(transactionToEdit.type);

        const matchingCategory = categoryList?.find(
          (c) => c.name === transactionToEdit.category
        );

        setSelectedCategoryId(matchingCategory ? matchingCategory.id : null);

        setDate(new Date(transactionToEdit.date).toISOString().split("T")[0]);
        setNotes(transactionToEdit.notes || "");
      } else {
        // ADD MODE (Reset)
        setMerchant("");
        setAmount("");
        setCurrency("SGD");
        setType("expense");
        setSelectedCategoryId(null);
        setDate(new Date().toISOString().split("T")[0]);
        setNotes("");
      }
    }
  }, [visible, transactionToEdit, categoryList]);

  const closeAllDropdowns = () => {
    setIsTypeOpen(false);
    setIsCategoryOpen(false);
    setIsCurrencyOpen(false);
  };

  const handleSave = async () => {
    if (!merchant.trim() || !date.trim()) {
      Alert.alert("Missing Fields", "Please fill in merchant and date");
      return;
    }

    if (!selectedCategory) {
      Alert.alert("Missing Fields", "Please select a category");
      return;
    }

    setIsSubmitting(true);

    const transactionData = {
      merchant: merchant.trim(),
      amount: parseFloat(amount),
      currency,
      type,
      category: selectedCategory.name,
      date: new Date(date).toISOString(),
      notes: notes.trim() || null,
      source: "User",
    };

    try {
      if (transactionToEdit) {
        await db
          .update(transactions)
          .set(transactionData)
          .where(eq(transactions.id, transactionToEdit.id));
      } else {
        await db.insert(transactions).values({
          ...transactionData,
          emailId: `user_${Date.now()}`, // Required unique ID for manual entries
        });
      }
      onClose();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to save transaction.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!transactionToEdit) return;
    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to delete this transaction?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await db
                .delete(transactions)
                .where(eq(transactions.id, transactionToEdit.id));
              onClose();
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "Failed to delete transaction.");
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <TouchableWithoutFeedback
        onPress={() => {
          onClose();
          closeAllDropdowns();
        }}
      >
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <Animated.View
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(200)}
              style={styles.dialogContainer}
            >
              <Text style={styles.title}>
                {transactionToEdit ? "Edit" : "Add"} Transaction
              </Text>
              <Text style={styles.subtitle}>
                Enter details below to update your records.
              </Text>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                keyboardShouldPersistTaps="handled"
              >
                {/* Merchant */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Merchant</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Starbucks"
                    placeholderTextColor="#9ca3af"
                    value={merchant}
                    onChangeText={setMerchant}
                  />
                </View>

                {/* Amount & Currency */}
                <View style={[styles.row, styles.fieldGroup]}>
                  <View style={{ flex: 1.5 }}>
                    <Text style={styles.label}>Amount</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0.00"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      value={amount}
                      onChangeText={setAmount}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.label}>Currency</Text>
                    <TouchableOpacity
                      style={styles.dropdownTrigger}
                      onPress={() => {
                        setIsCurrencyOpen(!isCurrencyOpen);
                        setIsTypeOpen(false);
                        setIsCategoryOpen(false);
                      }}
                    >
                      <Text style={styles.triggerText}>{currency}</Text>
                      <Feather
                        name={isCurrencyOpen ? "chevron-up" : "chevron-down"}
                        size={16}
                        color="#6b7280"
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Currency List */}
                {isCurrencyOpen && (
                  <View style={styles.dropdownListContainer}>
                    {CURRENCY_OPTIONS.map((cur) => (
                      <TouchableOpacity
                        key={cur}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setCurrency(cur);
                          setIsCurrencyOpen(false);
                        }}
                      >
                        <Text style={styles.itemText}>{cur}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Type Dropdown */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Type</Text>
                  <TouchableOpacity
                    style={styles.dropdownTrigger}
                    onPress={() => {
                      setIsTypeOpen(!isTypeOpen);
                      setIsCategoryOpen(false);
                      setIsCurrencyOpen(false);
                    }}
                  >
                    <View style={styles.triggerContent}>
                      <Text style={{ fontSize: 18 }}>
                        {TYPE_OPTIONS.find((t) => t.key === type)?.icon}
                      </Text>
                      <Text style={styles.triggerText}>
                        {TYPE_OPTIONS.find((t) => t.key === type)?.label}
                      </Text>
                    </View>
                    <Feather
                      name={isTypeOpen ? "chevron-up" : "chevron-down"}
                      size={18}
                      color="#6b7280"
                    />
                  </TouchableOpacity>
                  {isTypeOpen && (
                    <View style={styles.dropdownListContainer}>
                      {TYPE_OPTIONS.map((item) => (
                        <TouchableOpacity
                          key={item.key}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setType(item.key as any);
                            setIsTypeOpen(false);
                          }}
                        >
                          <Text style={styles.itemText}>
                            {item.icon} {item.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Category Dropdown */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Category</Text>
                  <TouchableOpacity
                    style={styles.dropdownTrigger}
                    onPress={() => {
                      setIsCategoryOpen(!isCategoryOpen);
                      setIsTypeOpen(false);
                      setIsCurrencyOpen(false);
                    }}
                  >
                    <View style={styles.triggerContent}>
                      {selectedCategory ? (
                        <>
                          <Text style={{ fontSize: 18 }}>
                            {selectedCategory.icon}
                          </Text>
                          <Text style={styles.triggerText}>
                            {selectedCategory.name}
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.placeholderText}>
                          Select category...
                        </Text>
                      )}
                    </View>
                    <Feather
                      name={isCategoryOpen ? "chevron-up" : "chevron-down"}
                      size={18}
                      color="#6b7280"
                    />
                  </TouchableOpacity>
                  {isCategoryOpen && (
                    <View style={styles.dropdownListContainer}>
                      {categoryList.map((cat) => (
                        <TouchableOpacity
                          key={cat.id}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setSelectedCategoryId(cat.id);
                            setIsCategoryOpen(false);
                          }}
                        >
                          <View style={styles.triggerContent}>
                            <Text style={{ fontSize: 16 }}>{cat.icon}</Text>
                            <Text style={styles.itemText}>{cat.name}</Text>
                          </View>
                          <View
                            style={[styles.dot, { backgroundColor: cat.color }]}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Date */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.input}
                    value={date}
                    onChangeText={setDate}
                  />
                </View>

                {/* Notes */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Notes (Optional)</Text>
                  <TextInput
                    style={[
                      styles.input,
                      { height: 70, textAlignVertical: "top" },
                    ]}
                    multiline
                    value={notes}
                    onChangeText={setNotes}
                  />
                </View>

                {/* Footer Buttons */}
                <View style={styles.footer}>
                  {transactionToEdit && (
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={handleDelete}
                    >
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  )}
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 12,
                      marginLeft: "auto",
                    }}
                  >
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={onClose}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.createButton}
                      onPress={handleSave}
                      disabled={isSubmitting}
                    >
                      <Text style={styles.createButtonText}>
                        {isSubmitting ? "Saving..." : "Save"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  dialogContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    maxWidth: 400,
    maxHeight: "90%",
    // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    // Shadow for Android
    elevation: 5,
  },
  fieldGroup: {
    marginBottom: 12, // Consistent spacing between fields
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 20,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: "#1f2937",
    marginBottom: 20,
  },
  readOnlyBox: {
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    padding: 12,
    height: 50,
    justifyContent: "center",
  },
  row: { flexDirection: "row", marginBottom: 4 },
  dropdownTrigger: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  triggerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  triggerText: {
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "500",
  },
  placeholderText: {
    color: "#9ca3af",
    fontSize: 14,
  },
  dropdownListContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
    // Elevation for shadow
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownItem: {
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  itemText: {
    fontSize: 14,
    color: "#374151",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  deleteButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
  },
  deleteButtonText: {
    color: "#b91c1c",
    fontWeight: "600",
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
  },
  cancelButtonText: {
    color: "#374151",
    fontWeight: "600",
  },
  createButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#000",
  },
  createButtonText: {
    color: "white",
    fontWeight: "600",
  },
});
