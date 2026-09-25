import type { ConversationView } from "@spring/shared";
import { Pressable, Text, View } from "react-native";
import { formatWhen } from "../lib/time";
import { useColors } from "../theme";
import { Icon } from "./Icon";

export function RecentRow({
  item,
  modeLabel,
  locale,
  empty,
  onPress,
}: {
  item?: ConversationView;
  modeLabel: string;
  locale: "zh-HK" | "en";
  empty?: string;
  onPress?: () => void;
}) {
  const colors = useColors();
  if (!item) {
    return <Text style={{ color: colors.muted, paddingVertical: 8 }}>{empty}</Text>;
  }
  return (
    <Pressable onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 12, marginBottom: 8 }}>
      <Icon name="chatbubble-outline" color={colors.accent} size={18} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.ink }} numberOfLines={1}>{item.title || modeLabel}</Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{modeLabel} · {formatWhen(item.lastMessageAt, locale)}</Text>
      </View>
    </Pressable>
  );
}
