import { SUGGESTED_PROMPTS_ZH } from "@spring/shared";
import { Pressable, Text, View } from "react-native";
import { useColors } from "../../shared/theme";

const ENGLISH = [
  "Explain, in three points, how to read “gather wealth, gather wisdom.”",
  "Draft a polite business follow-up email.",
  "Rewrite this classical passage in plain traditional Chinese.",
  "What international news should an investor notice today? General knowledge only, no live prices.",
  "Make a simple daily health routine.",
];

export function EmptyHero({ locale, onPick }: { locale: "zh-HK" | "en"; onPick: (prompt: string) => void }) {
  const colors = useColors();
  const prompts = locale === "en" ? ENGLISH : [...SUGGESTED_PROMPTS_ZH];
  return (
    <View style={{ paddingVertical: 28, gap: 12 }}>
      <Text style={{ fontSize: 36, color: colors.ink, fontFamily: "Palatino" }}>智泉</Text>
      <Text style={{ color: colors.gold, marginBottom: 8 }}>{locale === "en" ? "Drink from the spring of wisdom" : "共飲智慧之泉"}</Text>
      {prompts.map((prompt) => (
        <Pressable key={prompt} onPress={() => onPick(prompt)} style={{ borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, borderRadius: 14, padding: 14 }}>
          <Text style={{ color: colors.ink, lineHeight: 22 }}>{prompt}</Text>
        </Pressable>
      ))}
    </View>
  );
}
