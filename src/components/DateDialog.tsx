import { useEffect, useState } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import DateTimePicker, {
  DateType,
  useDefaultStyles,
} from "react-native-ui-datepicker";

type DateRange = { startDate: DateType; endDate: DateType };

type Props = {
  visible: boolean;
  value: DateRange;
  onApply: (range: DateRange) => void;
  onClose: () => void;
  onClear: () => void;
};

export default function DateDialog({
  visible,
  value,
  onApply,
  onClose,
  onClear,
}: Props) {
  const defaultStyles = useDefaultStyles();
  const [draft, setDraft] = useState<DateRange>(value);

  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);

  let today = new Date();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialogContainer}>
          <Text style={styles.title}>Filter by date</Text>

          <DateTimePicker
            mode="range"
            startDate={draft.startDate}
            endDate={draft.endDate}
            maxDate={today}
            onChange={setDraft}
            styles={defaultStyles}
          />

          <View style={styles.footer}>
            <View style={{ flexDirection: "row" }}>
              <TouchableOpacity
                onPress={() => {
                  setDraft({ startDate: undefined, endDate: undefined });
                  onClear();
                }}
              >
                <Text>Clear</Text>
              </TouchableOpacity>
            </View>
            <View
              style={{
                flexDirection: "row",
                gap: 32,
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  onClose();
                }}
              >
                <Text>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  onApply(draft);
                  onClose();
                }}
              >
                <Text>Apply</Text>
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
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 20,
  },
});
