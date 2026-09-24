import { TRANSLATE_LANGUAGES } from "@spring/shared";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { openChat, type MainTabParamList } from "../../navigation/MainTabs";
import { copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";
import { Icon } from "../../shared/ui/Icon";
import { ScreenHeader } from "../../shared/ui/ScreenHeader";

type Props = BottomTabScreenProps<MainTabParamList, "Translate">;

export function TranslateScreen({ navigation }: Props) {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const [sourceLang, setSourceLang] = useState("zh-HK");
  const [targetLang, setTargetLang] = useState("en");
  const [side, setSide] = useState<"source" | "target">("source");
  const [body, setBody] = useState("");
  const name = (id: string) => {
    const language = TRANSLATE_LANGUAGES.find((item) => item.id === id);
    return locale === "en" ? language?.en : language?.zh;
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: 20 }}>
      <ScreenHeader title={text.translate} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Pressable onPress={() => setSide("source")} style={sideBox(colors, side === "source")}>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{text.from}</Text>
          <Text style={{ color: colors.ink }}>{name(sourceLang)}</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={text.from}
          onPress={() => {
            setSourceLang(targetLang);
            setTargetLang(sourceLang);
          }}
          style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" }}
        >
          <Icon name="swap-horizontal" color={colors.accent} size={20} />
        </Pressable>
        <Pressable onPress={() => setSide("target")} style={sideBox(colors, side === "target")}>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{text.to}</Text>
          <Text style={{ color: colors.ink }}>{name(targetLang)}</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {TRANSLATE_LANGUAGES.map((language) => (
          <Pressable
            key={language.id}
            onPress={() => (side === "source" ? setSourceLang(language.id) : setTargetLang(language.id))}
            style={chip(colors, (side === "source" ? sourceLang : targetLang) === language.id)}
          >
            <Text style={{ color: colors.ink }}>{locale === "en" ? language.en : language.zh}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={body}
        onChangeText={setBody}
        multiline
        placeholder={text.original}
        placeholderTextColor={colors.muted}
        style={{ flex: 1, minHeight: 160, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, color: colors.ink, borderRadius: 16, padding: 14, fontSize: 16 }}
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

function sideBox(colors: { card: string; line: string; accent: string }, selected: boolean) {
  return {
    flex: 1,
    borderWidth: 1,
    borderColor: selected ? colors.accent : colors.line,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  };
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
