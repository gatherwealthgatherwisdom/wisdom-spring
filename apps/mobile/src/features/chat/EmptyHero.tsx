import { Pressable, Text, View } from "react-native";
import type { Copy } from "../../shared/lib/i18n";
import { useColors } from "../../shared/theme";

export function EmptyHero({
  text,
  onCard,
}: {
  text: Copy;
  onCard: (card: "email" | "translate" | "image" | "resume") => void;
}) {
  const colors = useColors();
  const cards = [
    ["email", text.cards.email],
    ["translate", text.cards.translate],
    ["image", text.cards.image],
    ["resume", text.cards.resume],
  ] as const;
  return (
    <View style={{ paddingVertical: 24, gap: 12 }}>
      <Text style={{ fontSize: 28, color: colors.ink, fontFamily: "Palatino" }}>智泉</Text>
      <Text style={{ color: colors.muted, marginBottom: 8 }}>{text.splash}</Text>
      {cards.map(([id, label]) => (
        <Pressable key={id} onPress={() => onCard(id)} style={{ borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, borderRadius: 14, padding: 16 }}>
          <Text style={{ color: colors.ink, fontSize: 16 }}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}
