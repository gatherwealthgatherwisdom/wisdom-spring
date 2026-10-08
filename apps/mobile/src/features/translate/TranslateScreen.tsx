import { TRANSLATE_LANGUAGES } from "@spring/shared";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Screen } from "../../shared/ui/Screen";
import type { AppStackParamList } from "../../navigation/RootNavigation";
import { spring } from "../../shared/lib/api";
import { useHistory } from "../../shared/lib/history";
import { copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";
import { Icon } from "../../shared/ui/Icon";
import { RecentRow } from "../../shared/ui/RecentRow";
import { ScreenHeader } from "../../shared/ui/ScreenHeader";

type Props = NativeStackScreenProps<AppStackParamList, "Translate">;

export function TranslateScreen({ navigation, route }: Props) {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const [sourceLang, setSourceLang] = useState("zh-HK");
  const [targetLang, setTargetLang] = useState("en");
  const [side, setSide] = useState<"source" | "target">("source");
  const [body, setBody] = useState("");
  const chats = useHistory({ mode: "translate" });
  const catalog = useQuery({ queryKey: ["catalog-languages"], queryFn: () => spring.catalogLanguages() });
  const languages = catalog.data?.items ?? TRANSLATE_LANGUAGES;
  const recent = chats.items.slice(0, 5);
  const source = useMemo(
    () => (languages.some((item) => item.id === sourceLang) ? sourceLang : (languages[0]?.id ?? "zh-HK")),
    [languages, sourceLang],
  );
  const target = useMemo(
    () => (languages.some((item) => item.id === targetLang) ? targetLang : (languages[1]?.id ?? languages[0]?.id ?? "en")),
    [languages, targetLang],
  );
  const name = (id: string) => {
    const language = languages.find((item) => item.id === id);
    return locale === "en" ? language?.en : language?.zh;
  };
  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}>
      <ScrollView contentContainerStyle={{ padding: 20, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
      <ScreenHeader title={text.translate} onBack={() => navigation.goBack()} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Pressable onPress={() => setSide("source")} style={sideBox(colors, side === "source")}>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{text.from}</Text>
          <Text style={{ color: colors.ink }}>{name(source)}</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={text.from}
          onPress={() => {
            setSourceLang(target);
            setTargetLang(source);
          }}
          style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" }}
        >
          <Icon name="swap-horizontal" color={colors.accent} size={20} />
        </Pressable>
        <Pressable onPress={() => setSide("target")} style={sideBox(colors, side === "target")}>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{text.to}</Text>
          <Text style={{ color: colors.ink }}>{name(target)}</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {languages.map((language) => (
          <Pressable
            key={language.id}
            onPress={() => (side === "source" ? setSourceLang(language.id) : setTargetLang(language.id))}
            style={chip(colors, (side === "source" ? source : target) === language.id)}
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
        style={{ minHeight: 140, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, color: colors.ink, borderRadius: 16, padding: 14, fontSize: 16 }}
      />
      <Text style={{ color: colors.muted, marginTop: 6, marginBottom: 12 }}>{text.chars(body.length)}</Text>
      <Text style={{ color: colors.muted, marginBottom: 8 }}>{text.recentTranslate}</Text>
      {recent.length === 0 ? <RecentRow modeLabel={text.translate} locale={locale} empty={text.emptyTranslate} /> : recent.map((item) => (
        <RecentRow key={item.id} item={item} modeLabel={text.translate} locale={locale} onPress={() => navigation.navigate("Chat", { conversationId: item.id, mode: "translate" })} />
      ))}
      <Pressable
        onPress={() => {
          if (!body.trim()) return;
          navigation.navigate("Chat", {
            mode: "translate",
            sourceLang: source,
            targetLang: target,
            seed: body.trim(),
            ...(route.params?.templateId ? { templateId: route.params.templateId } : {}),
          });
          setBody("");
        }}
        style={{ marginTop: 14, backgroundColor: colors.accent, borderRadius: 16, padding: 14, alignItems: "center" }}
      >
        <Text style={{ color: colors.onAccent }}>{text.start}</Text>
      </Pressable>
      </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
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
