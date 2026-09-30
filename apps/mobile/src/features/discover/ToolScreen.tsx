import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../../navigation/RootNavigation";
import { copy } from "../../shared/lib/i18n";
import { spring } from "../../shared/lib/api";
import { usePrefs } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";
import { Screen } from "../../shared/ui/Screen";
import { paramsForLiveTool } from "../../navigation/MainTabs";
import { ScreenHeader } from "../../shared/ui/ScreenHeader";
import { toolsFromCatalog } from "./catalog";

type Props = NativeStackScreenProps<AppStackParamList, "Tool">;

export function ToolScreen({ navigation, route }: Props) {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const catalog = useQuery({ queryKey: ["catalog-tools"], queryFn: () => spring.catalogTools() });
  const tool = toolsFromCatalog(catalog.data?.items).find((item) => item.id === route.params.id);
  const [draft, setDraft] = useState("");
  const [shown, setShown] = useState("");
  if (!tool) {
    return (
      <Screen>
        <ScreenHeader title="" onBack={() => navigation.goBack()} />
      </Screen>
    );
  }
  const title = locale === "en" ? tool.en : tool.zh;
  const blurb = locale === "en" ? tool.blurbEn : tool.blurbZh;
  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}>
      <ScreenHeader title={title} onBack={() => navigation.goBack()} />
      <View style={{ flex: 1, paddingHorizontal: 20 }}>
      <Text style={{ color: colors.muted, marginBottom: 16 }}>{blurb}</Text>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder={text.placeholder}
        placeholderTextColor={colors.muted}
        multiline
        style={{ minHeight: 120, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, color: colors.ink, borderRadius: 16, padding: 14 }}
      />
      <Pressable
        onPress={() => {
          const live = paramsForLiveTool({ ...tool, live: true }, locale);
          if (live) {
            navigation.navigate("Chat", live.attach ? live : { ...live, seed: draft.trim() || live.seed });
            return;
          }
          const seed = draft.trim() || (locale === "en" ? tool.blurbEn : tool.blurbZh);
          setShown(seed);
        }}
        style={{ marginTop: 12, backgroundColor: colors.accent, borderRadius: 16, padding: 14, alignItems: "center" }}
      >
        <Text style={{ color: colors.onAccent }}>{text.start}</Text>
      </Pressable>
      {shown ? (
        <View style={{ marginTop: 16, backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.line }}>
          <Text style={{ color: colors.muted, marginBottom: 8 }}>{text.sample}</Text>
          <Text style={{ color: colors.ink, lineHeight: 24 }}>{shown}</Text>
        </View>
      ) : null}
      </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
