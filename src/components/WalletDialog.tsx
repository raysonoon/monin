import { useState } from "react";
import {
  Alert,
  Keyboard,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import Feather from "@expo/vector-icons/Feather";
import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { parseDDMMYYYYToISO } from "../../utils/dateFormatter";
import { wallets as walletsSchema, Wallet } from "../../db/schema";

interface WalletDialogProps {
  visible: boolean;
  onClose: () => void;
  walletToEdit?: Wallet | null;
}

interface WalletFormProps {
  walletToEdit?: Wallet | null;
  onClose: () => void;
}

const TYPE_OPTIONS = [
  { key: "cashless", label: "Cashless", icon: "💳" },
  { key: "cash", label: "Cash", icon: "💵" },
] as const;

const CURRENCY_OPTIONS = ["SGD", "CAD", "USD", "EUR", "GBP", "JPY", "MYR"];

const formatDateInput = (iso: string) =>
  new Date(iso)
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(",", "");

export default function WalletDialog({
  visible,
  onClose,
  walletToEdit,
}: WalletDialogProps) {
  const formKey = `${visible ? "open" : "closed"}-${walletToEdit?.id ?? "new"}`;

  return (
    <Modal visible={visible} transparent animationType="none">
      <SafeAreaView style={styles.safeArea}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <Animated.View
                key={formKey}
                entering={FadeIn.duration(300)}
                exiting={FadeOut.duration(200)}
                style={styles.dialogContainer}
              >
                <WalletDialogForm
                  walletToEdit={walletToEdit}
                  onClose={onClose}
                />
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    </Modal>
  );
}

function WalletDialogForm({ walletToEdit, onClose }: WalletFormProps) {
  const [name, setName] = useState(walletToEdit?.name ?? "");
  const [description, setDescription] = useState(
    walletToEdit?.description ?? ""
  );
  // const [icon, setIcon] = useState(walletToEdit?.icon ?? "👝");
  const [type, setType] = useState<(typeof TYPE_OPTIONS)[number]["key"]>(
    (walletToEdit?.type as (typeof TYPE_OPTIONS)[number]["key"]) ?? "cashless"
  );
  const [openingBalance, setOpeningBalance] = useState(
    walletToEdit ? walletToEdit.openingBalance.toFixed(2) : "0.00"
  );
  const [openingBalanceDate, setOpeningBalanceDate] = useState(
    walletToEdit
      ? formatDateInput(walletToEdit.openingBalanceDate)
      : formatDateInput(new Date().toISOString())
  );
  const [currency, setCurrency] = useState(walletToEdit?.currency ?? "SGD");
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Missing Name", "Please enter a wallet name.");
      return;
    }

    const parsedBalance = Number(openingBalance);
    if (Number.isNaN(parsedBalance)) {
      Alert.alert("Invalid Balance", "Opening balance must be a valid number.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        // icon: icon.trim() || "👝",
        type,
        openingBalance: parsedBalance,
        openingBalanceDate: parseDDMMYYYYToISO(openingBalanceDate),
        currency,
      };

      if (walletToEdit) {
        await db
          .update(walletsSchema)
          .set(payload)
          .where(eq(walletsSchema.id, walletToEdit.id));
      } else {
        await db.insert(walletsSchema).values(payload);
      }

      onClose();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to save wallet.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      enableOnAndroid
      extraScrollHeight={150}
      enableResetScrollToCoords={false}
    >
      <Text style={styles.title}>{walletToEdit ? "Edit" : "Add"} Wallet</Text>
      <Text style={styles.subtitle}>
        Track balances for different wallets separately
      </Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Cash"
          placeholderTextColor="#9ca3af"
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Description (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Add a note..."
          placeholderTextColor="#9ca3af"
          value={description}
          onChangeText={setDescription}
        />
      </View>

      <View style={styles.row}>
        {/* <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={styles.label}>Icon</Text>
          <TextInput
            style={styles.input}
            placeholder="👝"
            placeholderTextColor="#9ca3af"
            value={icon}
            onChangeText={setIcon}
          />
        </View> */}

        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={styles.label}>Type</Text>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            onPress={() => {
              setIsTypeOpen((value) => !value);
              setIsCurrencyOpen(false);
            }}
          >
            <Text style={styles.triggerText}>
              {TYPE_OPTIONS.find((item) => item.key === type)?.icon}{" "}
              {TYPE_OPTIONS.find((item) => item.key === type)?.label}
            </Text>
            <Feather
              name={isTypeOpen ? "chevron-up" : "chevron-down"}
              size={16}
              color="#6b7280"
            />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Currency</Text>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            onPress={() => {
              setIsCurrencyOpen((value) => !value);
              setIsTypeOpen(false);
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

      {isTypeOpen && (
        <View style={styles.dropdownListContainer}>
          {TYPE_OPTIONS.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.dropdownItem}
              onPress={() => {
                setType(item.key);
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

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Opening Balance</Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          placeholderTextColor="#9ca3af"
          keyboardType="numeric"
          value={openingBalance}
          onChangeText={setOpeningBalance}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Opening Balance Date</Text>
        <TextInput
          style={styles.input}
          value={openingBalanceDate}
          onChangeText={setOpeningBalanceDate}
        />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
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
    </KeyboardAwareScrollView>
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
    maxWidth: 420,
    maxHeight: "90%",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fieldGroup: {
    marginBottom: 12,
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
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
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
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
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
  footer: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
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
