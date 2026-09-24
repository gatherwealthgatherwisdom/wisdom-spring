import { Pressable, Text, View } from "react-native";
import type { Copy } from "../../shared/lib/i18n";
import { useColors } from "../../shared/theme";
import { Icon, type IconName } from "../../shared/ui/Icon";

export function EmptyHero({
  text,
  onCard,
}: {
  text: Copy;
  onCard: (card: "email" | "translate" | "image" | "resume") => void;
}) {
  const colors = useColors();
  const cards = [
    ["email", text.cards.email, "mail-outline"],
    ["translate", text.cards.translate, "language-outline"],
    ["image", text.cards.image, "image-outline"],
    ["resume", text.cards.resume, "chatbubble-outline"],
  ] as const;
  return (
    <View style={{ paddingVertical: 24 }}>
      <Text style={{ fontSize: 28, color: colors.ink, fontFamily: "Palatino" }}>智泉</Text>
      <Text style={{ color: colors.muted, marginBottom: 16 }}>{text.splash}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {cards.map(([id, label, icon]) => (
          <Pressable key={id} onPress={() => onCard(id)} style={{ width: "47%", borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, borderRadius: 16, padding: 14, gap: 8 }}>
            <Icon name={icon} color={colors.accent} size={20} />
            <Text style={{ color: colors.ink, fontSize: 15 }}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
