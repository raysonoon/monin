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
import Feather from "@expo/vector-icons/Feather";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { categorizationService } from "../services/categorizationService";
import { db } from "../../db/client";
import { providers, Provider } from "../../db/schema";
import { eq } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import {
  generateAutoConfigs,
  ExtractionState,
  generateSlicingMarkers,
} from "../../utils/regexGenerator";

interface ProviderDialogProps {
  visible: boolean;
  onClose: () => void;
  providerToEdit?: Provider | null; // If null, we are in "Add" mode
}

const TYPE_OPTIONS = [
  { key: "expense", label: "Expense", icon: "💸" },
  { key: "income", label: "Income", icon: "💰" },
];

export default function ProviderDialog({
  visible,
  onClose,
  providerToEdit,
}: ProviderDialogProps) {
  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState<string | null>("");
  const [selectedType, setSelectedType] = useState("");

  // Validation & extraction state
  const [emailBody, setEmailBody] = useState("");
  const [transactionBlock, setTransactionBlock] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractionState | null>(
    null
  );

  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // Controls visibility of the list
  const [isSubmitting, setIsSubmitting] = useState(false);

  // const { data: categoryList } = useLiveQuery(
  //   db.select().from(categoriesSchema)
  // );

  // Reset or Populate form when dialog opens
  useEffect(() => {
    if (visible) {
      setIsDropdownOpen(false);
      if (providerToEdit) {
        // EDIT MODE
        setName(providerToEdit.name);
        setDescription(providerToEdit.description);
        setSelectedType("expense"); // Hard-coded and not dynamic yet
      } else {
        // ADD MODE (Reset)
        setName("");
        setDescription("");
        setEmailBody("");
        setTransactionBlock("");
        setSelectedType("");
      }
    }
  }, [visible, providerToEdit]);

  // Generate parsed data from transaction block
  useEffect(() => {
    if (transactionBlock.trim().length > 0) {
      setIsDirty(true);
      const config = generateAutoConfigs(transactionBlock);
      setExtractedData(config);
    } else {
      setIsDirty(false);
      setExtractedData(null);
    }
  }, [transactionBlock]);

  // Helper to render read-only fields with status icons
  const ReadOnlyField = ({
    label,
    value,
    placeholder,
  }: {
    label: string;
    value: string;
    placeholder?: string;
  }) => (
    <View>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {isDirty && (
          <Feather
            name={value ? "check-circle" : "x-circle"}
            size={16}
            color={value ? "#10b981" : "#ef4444"}
          />
        )}
      </View>
      <TextInput
        style={[styles.input, styles.inputReadOnly]}
        value={value}
        placeholder={placeholder}
        editable={false} // Disable manual editing
        selectTextOnFocus={false}
      />
    </View>
  );

  // const handleSave = async () => {
  //   if (!name.trim()) {
  //     Alert.alert("Missing Merchant", "Please enter a merchant name.");
  //     return;
  //   }

  //   if (!selectedCategoryId) {
  //     Alert.alert("Missing Category", "Please select a category.");
  //     return;
  //   }

  //   setIsSubmitting(true);

  //   try {
  //     const categoryName =
  //       categoryList.find((cat) => cat.id === selectedCategoryId)?.name ?? "";

  //     if (merchantToEdit) {
  //       // --- UPDATE EXISTING ---
  //       await categorizationService.editUserRule(
  //         merchantToEdit.id,
  //         name.trim(),
  //         selectedCategoryId,
  //         categoryName
  //       );
  //     } else {
  //       // --- CREATE NEW ---
  //       await categorizationService.addUserRule(
  //         name.trim(),
  //         selectedCategoryId,
  //         categoryName
  //       );
  //     }
  //     onClose();
  //   } catch (error) {
  //     console.error(error);
  //     Alert.alert(
  //       "Error",
  //       "Failed to save categorization rule. Name might be a duplicate."
  //     );
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // };

  // const handleDelete = async () => {
  //   if (!merchantToEdit) return;
  //   Alert.alert(
  //     "Delete Categorization Rule",
  //     "Are you sure you want to delete this rule?",
  //     [
  //       { text: "Cancel", style: "cancel" },
  //       {
  //         text: "Delete",
  //         style: "destructive",
  //         onPress: async () => {
  //           setIsSubmitting(true);
  //           try {
  //             await categorizationService.deleteUserRule(merchantToEdit.id);
  //             onClose();
  //           } catch (error) {
  //             console.error(error);
  //             Alert.alert("Error", "Failed to delete category.");
  //           } finally {
  //             setIsSubmitting(false);
  //           }
  //         },
  //       },
  //     ]
  //   );
  // };

  return (
    <Modal visible={visible} transparent>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <Animated.View
            entering={FadeIn.duration(400)} // Custom fade-in speed
            exiting={FadeOut.duration(100)} // Custom fade-out speed
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.dialogContainer}>
                <Text style={styles.title}>
                  {providerToEdit
                    ? "Edit Payment Provider"
                    : "Add Payment Provider"}
                </Text>
                <Text style={styles.subtitle}>
                  {providerToEdit
                    ? "Update your provider details below"
                    : "Configure a new payment provider by providing a sample email. Transaction data would be parsed automatically"}
                </Text>

                <ScrollView style={{ maxHeight: 600 }}>
                  {/* Name Input */}
                  <Text style={styles.label}>Provider name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Revolut, MariBank, GrabPay"
                    value={name}
                    onChangeText={setName}
                  />

                  {/* Description Input */}
                  <Text style={styles.label}>Provider description</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Multi-currency wallet, Credit card, Savings account"
                    value={name}
                    onChangeText={setDescription}
                  />

                  {/* Email Body */}
                  <Text style={styles.label}>Full Email Body</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    multiline
                    placeholder="Paste the full email body here..."
                    value={emailBody}
                    onChangeText={(text) => {
                      setEmailBody(text);
                    }}
                  />

                  {/* Transaction Block */}
                  <Text style={styles.label}>Transaction Block</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    multiline
                    placeholder="Paste transaction details here..."
                    value={transactionBlock}
                    onChangeText={(text) => {
                      setTransactionBlock(text);
                      if (!isDirty) setIsDirty(true);
                    }}
                  />

                  <View>
                    <Text style={styles.label}>
                      Parsed Transaction Data - Review & Validate
                    </Text>

                    <ReadOnlyField
                      label="Merchant"
                      value={extractedData?.merchant ?? ""}
                    />
                    <ReadOnlyField
                      label="Currency"
                      value={extractedData?.currency ?? ""}
                    />
                    <ReadOnlyField
                      label="Amount"
                      value={extractedData?.amount ?? ""}
                    />
                  </View>

                  {/* --- TYPE DROPDOWN --- */}
                  <Text style={styles.label}>Type</Text>

                  {/* 1. The Trigger Button (Shows selection or placeholder) */}
                  <TouchableOpacity
                    style={[
                      styles.dropdownTrigger,
                      // Add red border if user tries to submit without selecting? (Optional)
                    ]}
                    onPress={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      {selectedType ? (
                        <>
                          <Text style={{ fontSize: 18 }}>
                            {
                              TYPE_OPTIONS.find((t) => t.key === selectedType)
                                ?.icon
                            }
                          </Text>
                          <Text style={styles.triggerText}>
                            {
                              TYPE_OPTIONS.find((t) => t.key === selectedType)
                                ?.label
                            }
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.placeholderText}>
                          Select a type...
                        </Text>
                      )}
                    </View>
                    <Feather
                      name={isDropdownOpen ? "chevron-up" : "chevron-down"}
                      size={20}
                      color="#6b7280"
                    />
                  </TouchableOpacity>

                  {/* 2. The List (Only renders when open) */}
                  {isDropdownOpen && (
                    <View style={styles.dropdownListContainer}>
                      <ScrollView
                        style={{ maxHeight: 150 }}
                        nestedScrollEnabled
                      >
                        {TYPE_OPTIONS.map((type) => (
                          <TouchableOpacity
                            key={type.key}
                            style={styles.dropdownItem}
                            onPress={() => {
                              setSelectedType(type.key);
                              setIsDropdownOpen(false);
                            }}
                          >
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 10,
                              }}
                            >
                              <Text style={{ fontSize: 16 }}>{type.icon}</Text>
                              <Text style={styles.itemText}>{type.label}</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View style={styles.footer}>
                    <View style={{ flexDirection: "row" }}>
                      {providerToEdit && (
                        <TouchableOpacity
                          style={styles.deleteButton}
                          disabled={isSubmitting}
                        >
                          <Text style={styles.deleteButtonText}>Delete</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 12,
                      }}
                    >
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={onClose}
                        disabled={isSubmitting}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.createButton}
                        disabled={isSubmitting}
                      >
                        <Text style={styles.createButtonText}>
                          {isSubmitting
                            ? "Saving..."
                            : providerToEdit
                              ? "Save"
                              : "Create"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </Animated.View>
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
    // Shadow for iOS
    shadowColor: "M#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    // Shadow for Android
    elevation: 5,
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
  textArea: {
    height: 120,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
    textAlignVertical: "top",
  },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f3f4f6", // Light gray background
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  triggerText: {
    fontSize: 16,
    color: "#1f2937",
    fontWeight: "500",
  },
  placeholderText: {
    fontSize: 16,
    color: "#9ca3af", // Gray placeholder color
  },
  dropdownListContainer: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    marginBottom: 20,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  itemText: {
    fontSize: 15,
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
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  inputReadOnly: { backgroundColor: "#f9fafb", borderColor: "#e5e7eb" },
  inputError: { backgroundColor: "#fff1f2", borderColor: "#fecaca" },
  hintText: {
    fontSize: 12,
    color: "#b91c1c",
    marginTop: 4,
    fontStyle: "italic",
  },
});
