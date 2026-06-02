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
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import Feather from "@expo/vector-icons/Feather";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { db } from "../../db/client";
import { providers, Provider } from "../../db/schema";
import { eq } from "drizzle-orm";
import { generateGmailQuery } from "../../utils/gmailQueryGenerator";
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

const TYPE_OPTIONS: {
  key: Provider["type"];
  label: string;
  icon: string;
}[] = [
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
  const [subject, setSubject] = useState("");
  const [address, setAddress] = useState("");
  const [selectedType, setSelectedType] = useState<Provider["type"]>("expense");

  // Validation & extraction state
  const [emailBody, setEmailBody] = useState("");
  const [transactionBlock, setTransactionBlock] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractionState | null>(
    null
  );

  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // Controls visibility of the list
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedTypeOption = TYPE_OPTIONS.find(
    (option) => option.key === selectedType
  );

  // Reset or Populate form when dialog opens
  useEffect(() => {
    if (visible) {
      setIsDropdownOpen(false);
      if (providerToEdit) {
        const config = JSON.parse(providerToEdit.config || "{}");

        // EDIT MODE
        setName(providerToEdit.name);
        setDescription(providerToEdit.description);
        setSubject(config.subject);
        setAddress(config.address);
        setEmailBody(config.sampleEmail);
        setTransactionBlock(config.sampleTransaction);
        setSelectedType(providerToEdit.type);

        // Populate readonly fields
        setExtractedData({
          merchant: config.sampleMerchant,
          amount: config.sampleAmount,
          currency: config.sampleCurrency,
          date: config.sampleDate,
          merchantRegex: config.merchantRegex,
          amountRegex: config.amountRegex,
          hints: {},
        });
      } else {
        // ADD MODE (Reset)
        setName("");
        setDescription("");
        setSubject("");
        setAddress("");
        setEmailBody("");
        setTransactionBlock("");
        setSelectedType("expense");
        setExtractedData(null);
      }
    }
  }, [visible, providerToEdit]);

  // Auto parse data if user changes transactionBlock
  useEffect(() => {
    if (!transactionBlock) return;

    // Check if current text is different from what is in the DB
    const savedConfig = providerToEdit
      ? JSON.parse(providerToEdit.config || "{}")
      : null;
    const isNewText = transactionBlock !== savedConfig?.sampleBlock;

    if (isNewText) {
      console.log("User changed transaction data, re-generating...");
      const newData = generateAutoConfigs(transactionBlock);
      if (newData) setExtractedData(newData);
    } else {
      console.log("Text matches DB, skipping re-generation.");
    }
  }, [transactionBlock, providerToEdit]);

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

  const handleSaveProvider = async () => {
    if (!name.trim() || !subject.trim() || !address.trim()) {
      Alert.alert(
        "Missing Fields",
        "Please fill in the name, subject, and email address."
      );
      return;
    }

    if (
      !extractedData ||
      !extractedData.amountRegex ||
      !extractedData.merchantRegex
    ) {
      Alert.alert(
        "Invalid Extraction",
        "We couldn't generate a valid regex from your transaction block."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate gmail query
      const gmailQuery = generateGmailQuery(subject, address);
      // Generate location logic
      const { bodyStartMarker, bodyEndMarker } = generateSlicingMarkers(
        emailBody,
        transactionBlock
      );
      // Generate config object (to string into JSON)
      const providerConfig = {
        subject,
        address,
        gmailQuery,
        sampleEmail: emailBody,
        sampleTransaction: transactionBlock,
        sampleMerchant: extractedData.merchant,
        sampleAmount: extractedData.amount,
        sampleCurrency: extractedData.currency,
        sampleDate: extractedData.date,
        bodyStartMarker,
        bodyEndMarker,
        merchantRegex: extractedData.merchantRegex,
        merchantGroupIndex: extractedData.merchantGroupIndex,
        amountRegex: extractedData.amountRegex,
        currencyGroupIndex: extractedData.currencyGroupIndex,
        amountGroupIndex: extractedData.amountGroupIndex,
        dateRegex: extractedData.dateRegex,
        dateGroupIndex: extractedData.dateGroupIndex,
        timeGroupIndex: extractedData.timeGroupIndex,
        timezoneGroupIndex: extractedData.timezoneGroupIndex,
      };

      if (providerToEdit) {
        // --- UPDATE EXISTING ---
        await db
          .update(providers)
          .set({
            name: name.trim(),
            description: description?.trim(),
            icon: selectedType === "expense" ? "💸" : "💰",
            type: selectedType,
            config: JSON.stringify(providerConfig),
          })
          .where(eq(providers.id, providerToEdit.id));

        console.log("Provider updated successfully");
      } else {
        // --- CREATE NEW ---
        await db.insert(providers).values({
          name: name.trim(),
          description: description?.trim(),
          icon: selectedType === "expense" ? "💸" : "💰",
          config: JSON.stringify(providerConfig),
        });

        console.log("New provider created");
      }
      onClose();
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Error",
        "Failed to save payment provider. Name might be a duplicate."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!providerToEdit) return;
    Alert.alert(
      "Delete Payment Provider",
      "Are you sure you want to delete this payment provider?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await db
                .delete(providers)
                .where(eq(providers.id, providerToEdit.id));
              onClose();
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "Failed to delete payment provider.");
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent>
      <SafeAreaView style={styles.safeArea}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <Animated.View
                entering={FadeIn.duration(400)} // Custom fade-in speed
                exiting={FadeOut.duration(100)} // Custom fade-out speed
              >
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
                  <KeyboardAwareScrollView
                    showsVerticalScrollIndicator={false}
                    enableOnAndroid
                    extraScrollHeight={150}
                    enableResetScrollToCoords={false}
                  >
                    {/* Name Input */}
                    <Text style={styles.label}>Provider name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Revolut, MariBank, GrabPay"
                      placeholderTextColor="#9ca3af"
                      value={name}
                      onChangeText={setName}
                    />

                    {/* Description Input */}
                    <Text style={styles.label}>Provider description</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Savings account, Credit card"
                      placeholderTextColor="#9ca3af"
                      value={description ?? ""}
                      onChangeText={setDescription}
                    />

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
                        {selectedTypeOption ? (
                          <>
                            <Text style={{ fontSize: 14 }}>
                              {selectedTypeOption.icon}
                            </Text>
                            <Text style={styles.triggerText}>
                              {selectedTypeOption.label}
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
                          {TYPE_OPTIONS.map((option) => (
                            <TouchableOpacity
                              key={option.key}
                              style={styles.dropdownItem}
                              onPress={() => {
                                setSelectedType(option.key);
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
                                <Text style={{ fontSize: 16 }}>
                                  {option.icon}
                                </Text>
                                <Text style={styles.itemText}>
                                  {option.label}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    {/* Email Subject */}
                    <Text style={styles.label}>Email subject</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Card Transaction Alert"
                      placeholderTextColor="#9ca3af"
                      value={subject}
                      onChangeText={setSubject}
                    />

                    {/* Sender Email Address */}
                    <Text style={styles.label}>Email address</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. ibanking.alert@dbs.com"
                      placeholderTextColor="#9ca3af"
                      value={address}
                      onChangeText={setAddress}
                    />

                    {/* Email Body */}
                    <Text style={styles.label}>Full Email Body</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      multiline
                      placeholder="Paste the full email body here..."
                      placeholderTextColor="#9ca3af"
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
                      placeholderTextColor="#9ca3af"
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
                      <ReadOnlyField
                        label="Date"
                        value={extractedData?.date ?? ""}
                      />
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.footer}>
                      <View style={{ flexDirection: "row" }}>
                        {providerToEdit && (
                          <TouchableOpacity
                            style={styles.deleteButton}
                            disabled={isSubmitting}
                            onPress={handleDelete}
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
                          onPress={handleSaveProvider}
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
                  </KeyboardAwareScrollView>
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  overlay: {
    flex: 1,
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
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  triggerText: {
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "500",
  },
  placeholderText: {
    fontSize: 14,
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
