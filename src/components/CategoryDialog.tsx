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
import { categories, Category } from "../../db/schema";
import { eq } from "drizzle-orm";

// Simple hard-coded options for colors and icons field
const COLORS = [
  "#ef4444",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#171717",
];
const ICONS = ["🍔", "🚕", "🛒", "🛍️", "📄", "💸", "🎮", "🏥", "✈️", "🏠"];

interface CategoryDialogProps {
  visible: boolean;
  onClose: () => void;
  categoryToEdit?: Category | null; // If null, we are in "Add" mode
}

export default function CategoryDialog({
  visible,
  onClose,
  categoryToEdit,
}: CategoryDialogProps) {
  const [name, setName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState(ICONS[0]);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset or Populate form when dialog opens
  useEffect(() => {
    if (visible) {
      if (categoryToEdit) {
        // EDIT MODE
        setName(categoryToEdit.name);
        setSelectedIcon(categoryToEdit.icon);
        setSelectedColor(categoryToEdit.color);
      } else {
        // ADD MODE (Reset)
        setName("");
        setSelectedIcon(ICONS[0]);
        setSelectedColor(COLORS[0]);
      }
    }
  }, [visible, categoryToEdit]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Missing Category", "Please enter a category name.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (categoryToEdit) {
        // --- UPDATE EXISTING ---
        await db
          .update(categories)
          .set({
            name: name.trim(),
            icon: selectedIcon,
            color: selectedColor,
          })
          .where(eq(categories.id, categoryToEdit.id));
      } else {
        // --- CREATE NEW ---
        await db.insert(categories).values({
          name: name.trim(),
          icon: selectedIcon,
          color: selectedColor,
        });
      }
      console.log("DB Insert Success"); // Verify this prints in console
      onClose();
    } catch (error) {
      console.error(error);
      Alert.alert(
        "Error",
        "Failed to save category. Name might be a duplicate."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!categoryToEdit) return;
    Alert.alert(
      "Delete Category",
      "Are you sure you want to delete this category?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await db
                .delete(categories)
                .where(eq(categories.id, categoryToEdit.id));
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
                  {categoryToEdit ? "Edit Category" : "Add New Category"}
                </Text>
                <Text style={styles.subtitle}>
                  {categoryToEdit
                    ? "Update your category details below"
                    : "Create a custom category to organize your expenses"}
                </Text>

                {/* Name Input */}
                <Text style={styles.label}>Category name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Food & Dining"
                  value={name}
                  onChangeText={setName}
                />

                {/* Icon Picker (Simplified as horizontal list) */}
                <Text style={styles.label}>Icon</Text>
                <View style={styles.iconRow}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {ICONS.map((icon) => (
                      <TouchableOpacity
                        key={icon}
                        onPress={() => setSelectedIcon(icon)}
                        style={[
                          styles.iconOption,
                          selectedIcon === icon && styles.selectedIconOption,
                        ]}
                      >
                        <Text style={styles.iconText}>{icon}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Color Picker */}
                <Text style={styles.label}>Color</Text>
                <View style={styles.colorRow}>
                  {COLORS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      onPress={() => setSelectedColor(color)}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: color },
                        selectedColor === color && styles.selectedColorCircle,
                      ]}
                    />
                  ))}
                </View>

                {/* Action Buttons */}
                <View style={styles.footer}>
                  <View style={{ flexDirection: "row" }}>
                    {categoryToEdit && (
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
                          : categoryToEdit
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
  iconRow: {
    flexDirection: "row",
    marginBottom: 20,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedIconOption: {
    backgroundColor: "#e5e7eb",
    borderColor: "#000",
  },
  iconText: {
    fontSize: 22,
  },
  colorRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedColorCircle: {
    borderColor: "#000", // Black ring around selected color
    transform: [{ scale: 1.1 }],
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
