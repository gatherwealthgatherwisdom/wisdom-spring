import { toolPlaceholder, toolRequiresDraft } from "@spring/shared";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../../navigation/RootNavigation";
import { copy } from "../../shared/lib/i18n";
import { spring } from "../../shared/lib/api";
import { useHistory } from "../../shared/lib/history";
import { usePrefs } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";
import { Icon } from "../../shared/ui/Icon";
import { RecentRow } from "../../shared/ui/RecentRow";
import { Screen } from "../../shared/ui/Screen";
import { paramsForLiveTool } from "../../navigation/open";
import { ScreenHeader } from "../../shared/ui/ScreenHeader";
import { toolsFromCatalog } from "./catalog";

type Props = NativeStackScreenProps<AppStackParamList, "Tool">;

const EXAMPLES: Record<string, { zh: string; en: string }[]> = {
  rewrite: [
    { zh: "今日天氣好好，我想去行山。", en: "The weather is lovely and I want to hike." },
    { zh: "麻煩你盡快回覆，謝謝。", en: "Please reply as soon as you can, thanks." },
  ],
  solve: [{ zh: "12 個人分 3 組，每組幾多人？", en: "12 people into 3 groups, how many each?" }],
  memo: [{ zh: "聽日朝早九點見陳生，帶合約。", en: "Meet Mr Chan at 9am tomorrow. Bring the contract." }],
  plain: [{ zh: "鑒於貴司來函所述情況，現回覆如下。", en: "In light of your letter, we reply as follows." }],
  search: [{ zh: "香港今日有無紅色暴雨警告？", en: "Is there a red rainstorm warning in Hong Kong today?" }],
};

export function ToolScreen({ navigation, route }: Props) {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const catalog = useQuery({ queryKey: ["catalog-tools"], queryFn: () => spring.catalogTools() });
  const tool = toolsFromCatalog(catalog.data?.items).find((item) => item.id === route.params.id);
  const [draft, setDraft] = useState("");
  const [shown, setShown] = useState("");
  const chats = useHistory({ mode: tool?.mode });
  if (!tool) {
    return (
      <Screen>
        <ScreenHeader title="" onBack={() => navigation.goBack()} />
      </Screen>
    );
  }
  const title = locale === "en" ? tool.en : tool.zh;
  const blurb = locale === "en" ? tool.blurbEn : tool.blurbZh;
  const placeholder = toolPlaceholder(tool.id, locale) ?? text.placeholder;
  const typed = draft.trim();
  const ready = typed.length > 0 || !toolRequiresDraft(tool.id);
  const examples = EXAMPLES[tool.id] ?? [];
  const recent = chats.items.slice(0, 4);
  const recentLabel = tool.mode === "write" ? text.recentWrite : tool.mode === "translate" ? text.recentTranslate : text.recent;
  const emptyRecent = tool.mode === "write" ? text.emptyWrite : tool.mode === "translate" ? text.emptyTranslate : undefined;
  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}>
      <ScreenHeader title={title} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }} keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <Icon name={tool.icon} color={colors.accent} size={26} />
        <Text style={{ color: colors.muted, flex: 1 }}>{blurb}</Text>
      </View>
      <Text style={{ color: colors.muted, marginBottom: 16, lineHeight: 22 }}>{text.toolHint}</Text>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline
        style={{ minHeight: 120, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, color: colors.ink, borderRadius: 16, padding: 14 }}
      />
      {examples.length > 0 ? (
        <View style={{ marginTop: 12 }}>
          <Text style={{ color: colors.muted, marginBottom: 8 }}>{text.tryThis}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {examples.map((item) => {
              const label = locale === "en" ? item.en : item.zh;
              return (
                <Pressable
                  key={label}
                  onPress={() => setDraft(label)}
                  style={{ borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 }}
                >
                  <Text style={{ color: colors.ink, fontSize: 13 }}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      {!ready && toolRequiresDraft(tool.id) ? <Text style={{ color: colors.muted, marginTop: 10 }}>{text.needDraft}</Text> : null}
      <Pressable
        disabled={!ready}
        accessibilityRole="button"
        accessibilityLabel={text.start}
        accessibilityState={{ disabled: !ready }}
        onPress={() => {
          const live = paramsForLiveTool({ ...tool, live: true });
          if (live) {
            navigation.navigate("Chat", typed && !live.attach ? { ...live, seed: typed } : live);
            return;
          }
          if (typed) setShown(typed);
        }}
        style={{ marginTop: 12, backgroundColor: colors.accent, borderRadius: 16, padding: 14, alignItems: "center", opacity: ready ? 1 : 0.45 }}
      >
        <Text style={{ color: colors.onAccent }}>{text.start}</Text>
      </Pressable>
      {shown ? (
        <View style={{ marginTop: 16, backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.line }}>
          <Text style={{ color: colors.muted, marginBottom: 8 }}>{text.sample}</Text>
          <Text style={{ color: colors.ink, lineHeight: 24 }}>{shown}</Text>
        </View>
      ) : null}
      <Text style={{ color: colors.ink, fontSize: 16, marginTop: 22, marginBottom: 8 }}>{recentLabel}</Text>
      {recent.length === 0 ? (
        emptyRecent ? <RecentRow modeLabel={title} locale={locale} empty={emptyRecent} /> : null
      ) : (
        recent.map((item) => (
          <RecentRow
            key={item.id}
            item={item}
            modeLabel={title}
            locale={locale}
            onPress={() => navigation.navigate("Chat", { conversationId: item.id, mode: item.mode })}
          />
        ))
      )}
      </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
