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
import {
  categorizationRules,
  CategorizationRule,
  categories as categoriesSchema,
} from "../../db/schema";
import { eq } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";

interface MerchantDialogProps {
  visible: boolean;
  onClose: () => void;
  merchantToEdit?: CategorizationRule | null; // If null, we are in "Add" mode
}

export default function CategoryDialog({
  visible,
  onClose,
  merchantToEdit,
}: MerchantDialogProps) {
  const [name, setName] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // Controls visibility of the list
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
      setIsDropdownOpen(false);
      if (merchantToEdit) {
        // EDIT MODE
        setName(merchantToEdit.keyword);
        setSelectedCategoryId(merchantToEdit.categoryId);
      } else {
        // ADD MODE (Reset)
        setName("");
        setSelectedCategoryId(null);
      }
    }
  }, [visible, merchantToEdit]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Missing Merchant", "Please enter a merchant name.");
      return;
    }

    if (!selectedCategoryId) {
      Alert.alert("Missing Category", "Please select a category.");
      return;
    }

    setIsSubmitting(true);

    try {
      const categoryName =
        categoryList.find((cat) => cat.id === selectedCategoryId)?.name ?? "";

      if (merchantToEdit) {
        // --- UPDATE EXISTING ---
        await categorizationService.editUserRule(
          merchantToEdit.id,
          name.trim(),
          selectedCategoryId,
          categoryName
        );
      } else {
        // --- CREATE NEW ---
        await categorizationService.addUserRule(
          name.trim(),
          selectedCategoryId,
          categoryName
        );
      }
      onClose();
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Error",
        "Failed to save categorization rule. Name might be a duplicate."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!merchantToEdit) return;
    Alert.alert(
      "Delete Categorization Rule",
      "Are you sure you want to delete this rule?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await categorizationService.deleteUserRule(merchantToEdit.id);
              onClose();
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "Failed to delete category.");
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
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <Animated.View
            entering={FadeIn.duration(400)} // Custom fade-in speed
            exiting={FadeOut.duration(100)} // Custom fade-out speed
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.dialogContainer}>
                <Text style={styles.title}>
                  {merchantToEdit
                    ? "Edit Categorization Rule"
                    : "Add Categorization Rule"}
                </Text>
                <Text style={styles.subtitle}>
                  {merchantToEdit
                    ? "Update your category details below"
                    : "Create a custom category to organize your expenses"}
                </Text>

                {/* Name Input */}
                <Text style={styles.label}>Merchant name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Bus/MRT, Shopee"
                  value={name}
                  onChangeText={setName}
                />

                {/* --- CATEGORY DROPDOWN --- */}
                <Text style={styles.label}>Assign to Category</Text>

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
                        Select a category...
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
                    <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
                      {categoryList?.map((cat) => (
                        <TouchableOpacity
                          key={cat.id}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setSelectedCategoryId(cat.id);
                            setIsDropdownOpen(false); // Close menu on select
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <Text style={{ fontSize: 16 }}>{cat.icon}</Text>
                            <Text style={styles.itemText}>{cat.name}</Text>
                          </View>
                          {/* Color Dot */}
                          <View
                            style={[styles.dot, { backgroundColor: cat.color }]}
                          />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.footer}>
                  <View style={{ flexDirection: "row" }}>
                    {merchantToEdit && (
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={handleDelete}
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
                      onPress={handleSave}
                      disabled={isSubmitting}
                    >
                      <Text style={styles.createButtonText}>
                        {isSubmitting
                          ? "Saving..."
                          : merchantToEdit
                            ? "Save"
                            : "Create"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
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
});
