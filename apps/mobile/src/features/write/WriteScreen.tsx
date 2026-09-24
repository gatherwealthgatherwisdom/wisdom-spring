import { WRITE_TEMPLATES } from "@spring/shared";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Pressable, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { openChat, type MainTabParamList } from "../../navigation/MainTabs";
import { copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";
import { ScreenHeader } from "../../shared/ui/ScreenHeader";

type Props = BottomTabScreenProps<MainTabParamList, "Write">;

export function WriteScreen({ navigation }: Props) {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: 20 }}>
      <ScreenHeader title={text.write} />
      {WRITE_TEMPLATES.map((template) => (
        <Pressable
          key={template.id}
          onPress={() => openChat(navigation, { mode: "write", templateId: template.id })}
          style={{ backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 10 }}
        >
          <Text style={{ color: colors.ink, fontSize: 16 }}>{locale === "en" ? template.en : template.zh}</Text>
        </Pressable>
      ))}
    </SafeAreaView>
  );
}
