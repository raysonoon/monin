import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";

type OptionId = string | number;

type WalletOption = {
  id: OptionId;
  name: string;
};

type ProviderOption = {
  id: OptionId;
  name: string;
};

type CategoryOption = {
  id: OptionId;
  name: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: {
    type: string;
    wallet: string;
    provider: string;
    category: string;
  }) => void;
  initialType: string;
  initialWallet: string;
  initialProvider: string;
  initialCategory: string;
  types: string[];
  wallets: WalletOption[];
  providers: ProviderOption[];
  categories: CategoryOption[];
};

export default function FilterDialog({
  visible,
  onClose,
  onApply,
  initialType,
  initialWallet,
  initialProvider,
  initialCategory,
  types,
  wallets,
  providers,
  categories,
}: Props) {
  const [draftType, setDraftType] = useState(initialType);
  const [draftWallet, setDraftWallet] = useState(initialWallet);
  const [draftProvider, setDraftProvider] = useState(initialProvider);
  const [draftCategory, setDraftCategory] = useState(initialCategory);

  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isProviderOpen, setIsProviderOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      setDraftType(initialType);
      setDraftWallet(initialWallet);
      setDraftProvider(initialProvider);
      setDraftCategory(initialCategory);
      setIsWalletOpen(false);
      setIsProviderOpen(false);
      setIsCategoryOpen(false);
    }
  }, [visible, initialType, initialWallet, initialProvider, initialCategory]);

  const selectedWalletLabel = useMemo(() => {
    if (draftWallet === "All") return "All";
    return (
      wallets.find((wallet) => String(wallet.id) === draftWallet)?.name ??
      "Wallet"
    );
  }, [draftWallet, wallets]);

  const selectedProviderLabel = useMemo(() => {
    if (draftProvider === "All") return "All";
    return (
      providers.find((provider) => String(provider.id) === draftProvider)
        ?.name ?? "Provider"
    );
  }, [draftProvider, providers]);

  const selectedCategoryLabel = useMemo(() => {
    if (draftCategory === "All") return "All";
    return (
      categories.find((category) => category.name === draftCategory)?.name ??
      "Category"
    );
  }, [draftCategory, categories]);

  const handleClear = () => {
    setDraftType("All");
    setDraftWallet("All");
    setDraftProvider("All");
    setDraftCategory("All");
    setIsWalletOpen(false);
    setIsProviderOpen(false);
    setIsCategoryOpen(false);
  };

  const handleApply = () => {
    onApply({
      type: draftType,
      wallet: draftWallet,
      provider: draftProvider,
      category: draftCategory,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialogContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Filters</Text>
            <TouchableOpacity onPress={onClose} style={styles.iconButton}>
              <Feather name="x" size={20} color="#111827" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Type</Text>
              <View style={styles.chipRow}>
                {types.map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setDraftType(type)}
                    style={[
                      styles.chip,
                      draftType === type && styles.chipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        draftType === type && styles.chipTextActive,
                      ]}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Wallet</Text>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => {
                  setIsWalletOpen((open) => !open);
                  setIsProviderOpen(false);
                  setIsCategoryOpen(false);
                }}
              >
                <Text style={styles.triggerText}>{selectedWalletLabel}</Text>
                <Feather
                  name={isWalletOpen ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="#6b7280"
                />
              </TouchableOpacity>

              {isWalletOpen ? (
                <View style={styles.dropdownListContainer}>
                  <ScrollView nestedScrollEnabled style={styles.dropdownScroll}>
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        setDraftWallet("All");
                        setIsWalletOpen(false);
                      }}
                    >
                      <Text style={styles.itemText}>All</Text>
                    </TouchableOpacity>

                    {wallets.map((wallet) => (
                      <TouchableOpacity
                        key={wallet.id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setDraftWallet(String(wallet.id));
                          setIsWalletOpen(false);
                        }}
                      >
                        <Text style={styles.itemText}>{wallet.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Provider</Text>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => {
                  setIsProviderOpen((open) => !open);
                  setIsWalletOpen(false);
                  setIsCategoryOpen(false);
                }}
              >
                <Text style={styles.triggerText}>{selectedProviderLabel}</Text>
                <Feather
                  name={isProviderOpen ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="#6b7280"
                />
              </TouchableOpacity>

              {isProviderOpen ? (
                <View style={styles.dropdownListContainer}>
                  <ScrollView nestedScrollEnabled style={styles.dropdownScroll}>
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        setDraftProvider("All");
                        setIsProviderOpen(false);
                      }}
                    >
                      <Text style={styles.itemText}>All</Text>
                    </TouchableOpacity>

                    {providers.map((provider) => (
                      <TouchableOpacity
                        key={provider.id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setDraftProvider(String(provider.id));
                          setIsProviderOpen(false);
                        }}
                      >
                        <Text style={styles.itemText}>{provider.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Category</Text>
              <TouchableOpacity
                style={styles.dropdownTrigger}
                onPress={() => {
                  setIsCategoryOpen((open) => !open);
                  setIsWalletOpen(false);
                  setIsProviderOpen(false);
                }}
              >
                <Text style={styles.triggerText}>{selectedCategoryLabel}</Text>
                <Feather
                  name={isCategoryOpen ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="#6b7280"
                />
              </TouchableOpacity>

              {isCategoryOpen ? (
                <View style={styles.dropdownListContainer}>
                  <ScrollView nestedScrollEnabled style={styles.dropdownScroll}>
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        setDraftCategory("All");
                        setIsCategoryOpen(false);
                      }}
                    >
                      <Text style={styles.itemText}>All</Text>
                    </TouchableOpacity>

                    {categories.map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setDraftCategory(category.name);
                          setIsCategoryOpen(false);
                        }}
                      >
                        <Text style={styles.itemText}>{category.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleClear}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Clear</Text>
            </TouchableOpacity>

            <View style={styles.footerRight}>
              <TouchableOpacity
                onPress={onClose}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleApply}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
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
    width: "100%",
    maxWidth: 420,
    maxHeight: "80%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  iconButton: {
    padding: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
  },
  chipActive: {
    backgroundColor: "#111827",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    textTransform: "capitalize",
  },
  chipTextActive: {
    color: "#fff",
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
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  dropdownScroll: {
    maxHeight: 180,
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  itemText: {
    fontSize: 14,
    color: "#374151",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  },
  footerRight: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#f3f4f6",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  primaryButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#111827",
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
});
