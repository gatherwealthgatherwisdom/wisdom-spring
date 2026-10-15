import { labelFor } from "@spring/shared";
import { useQuery } from "@tanstack/react-query";
import { Modal, Pressable, Text, View } from "react-native";
import { useHostInsets } from "../../shared/ui/hostInsets";
import { spring } from "../../shared/lib/api";
import { copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";

export function PoolSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const colors = useColors();
  const insets = useHostInsets(open);
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const pool = useQuery({ queryKey: ["catalog-pool"], queryFn: () => spring.pool(), enabled: open });
  const items = pool.data?.items ?? [];
  return (
    <Modal visible={open} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "#00000066", justifyContent: "flex-end" }}>
        <Pressable onPress={() => undefined} style={{ backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: Math.max(insets.bottom, 20), maxHeight: "70%" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Text style={{ color: colors.ink, fontSize: 20, fontFamily: "Palatino" }}>{text.models}</Text>
            <Pressable onPress={onClose}><Text style={{ color: colors.muted, fontSize: 18 }}>×</Text></Pressable>
          </View>
          <Text style={{ color: colors.muted, marginBottom: 16 }}>{text.poolHint}</Text>
          {items.map((item) => (
            <View key={item.zh} style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 14, marginBottom: 8 }}>
              <Text style={{ color: colors.ink }}>{labelFor(item, locale)}</Text>
            </View>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
