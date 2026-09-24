import { WRITE_TEMPLATES } from "@spring/shared";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { openChat, type MainTabParamList } from "../../navigation/MainTabs";
import { copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";
import { Icon, type IconName } from "../../shared/ui/Icon";
import { ScreenHeader } from "../../shared/ui/ScreenHeader";

const TEMPLATE_ICON: Record<string, IconName> = {
  email: "mail-outline",
  report: "list-outline",
  rewrite: "refresh-outline",
  formal: "document-text-outline",
  plain: "chatbox-outline",
  cantonese: "chatbubbles-outline",
};

const TEMPLATE_NOTE: Record<string, { "zh-HK": string; en: string }> = {
  email: { "zh-HK": "穩重有禮，短段落", en: "Polite, in short paragraphs" },
  report: { "zh-HK": "背景、要點、下一步", en: "Background, points, next step" },
  rewrite: { "zh-HK": "保留原意，句子更清楚", en: "Clearer sentences, same meaning" },
  formal: { "zh-HK": "書面語，避免口語", en: "Written style, not spoken" },
  plain: { "zh-HK": "淺白短句", en: "Plain, short sentences" },
  cantonese: { "zh-HK": "香港廣東話，語氣自然", en: "Natural Hong Kong Cantonese" },
};

type Props = BottomTabScreenProps<MainTabParamList, "Write">;

export function WriteScreen({ navigation }: Props) {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: 20 }}>
      <ScreenHeader title={text.write} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {WRITE_TEMPLATES.map((template) => (
          <Pressable
            key={template.id}
            onPress={() => openChat(navigation, { mode: "write", templateId: template.id })}
            style={{ width: "47%", backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: 16, padding: 14, gap: 6 }}
          >
            <Icon name={TEMPLATE_ICON[template.id] ?? "create-outline"} color={colors.accent} size={20} />
            <Text style={{ color: colors.ink, fontSize: 16 }}>{locale === "en" ? template.en : template.zh}</Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>{TEMPLATE_NOTE[template.id]?.[locale] ?? ""}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}
