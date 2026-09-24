import { TRANSLATE_LANGUAGES } from "@spring/shared";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { openChat, type MainTabParamList } from "../../navigation/MainTabs";
import { copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";
import { ScreenHeader } from "../../shared/ui/ScreenHeader";

type Props = BottomTabScreenProps<MainTabParamList, "Translate">;

export function TranslateScreen({ navigation }: Props) {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const [sourceLang, setSourceLang] = useState("zh-HK");
  const [targetLang, setTargetLang] = useState("en");
  const [body, setBody] = useState("");
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: 20 }}>
      <ScreenHeader title={text.translate} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        {TRANSLATE_LANGUAGES.map((language) => (
          <Pressable key={`s-${language.id}`} onPress={() => setSourceLang(language.id)} style={chip(colors, sourceLang === language.id)}>
            <Text style={{ color: colors.ink }}>{locale === "en" ? language.en : language.zh}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ color: colors.muted, marginBottom: 8 }}>→</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {TRANSLATE_LANGUAGES.map((language) => (
          <Pressable key={`t-${language.id}`} onPress={() => setTargetLang(language.id)} style={chip(colors, targetLang === language.id)}>
            <Text style={{ color: colors.ink }}>{locale === "en" ? language.en : language.zh}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={body}
        onChangeText={setBody}
        multiline
        placeholder={text.placeholder}
        placeholderTextColor={colors.muted}
        style={{ minHeight: 120, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, color: colors.ink, borderRadius: 14, padding: 12 }}
      />
      <Pressable
        onPress={() => {
          if (!body.trim()) return;
          openChat(navigation, { mode: "translate", sourceLang, targetLang, seed: body.trim() });
          setBody("");
        }}
        style={{ marginTop: 14, backgroundColor: colors.accent, borderRadius: 16, padding: 14, alignItems: "center" }}
      >
        <Text style={{ color: colors.onAccent }}>{text.start}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function chip(colors: { card: string; line: string; accent: string }, selected: boolean) {
  return {
    borderWidth: 1,
    borderColor: selected ? colors.accent : colors.line,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  };
}
