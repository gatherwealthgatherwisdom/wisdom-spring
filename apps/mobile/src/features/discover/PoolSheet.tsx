import { Modal, Pressable, Text, View } from "react-native";
import { copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";
import { POOL_LABELS } from "./catalog";

export function PoolSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "#00000066", justifyContent: "flex-end" }}>
        <Pressable onPress={() => undefined} style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "70%" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ color: colors.ink, fontSize: 20, fontFamily: "Palatino" }}>{text.models}</Text>
            <Pressable onPress={onClose}><Text style={{ color: colors.muted, fontSize: 18 }}>×</Text></Pressable>
          </View>
          <Text style={{ color: colors.muted, marginBottom: 16 }}>{text.poolHint}</Text>
          {POOL_LABELS.map((label) => (
            <View key={label} style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 14, marginBottom: 8 }}>
              <Text style={{ color: colors.ink }}>{label}</Text>
            </View>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
