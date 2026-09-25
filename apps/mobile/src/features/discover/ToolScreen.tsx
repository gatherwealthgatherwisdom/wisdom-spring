import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../../navigation/RootNavigation";
import { copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";
import { Icon } from "../../shared/ui/Icon";
import { TOOLS } from "./catalog";

type Props = NativeStackScreenProps<AppStackParamList, "Tool">;

export function ToolScreen({ navigation, route }: Props) {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const tool = TOOLS.find((item) => item.id === route.params.id);
  const [draft, setDraft] = useState("");
  const [shown, setShown] = useState("");
  if (!tool) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: 20 }}>
        <Pressable onPress={() => navigation.goBack()}><Icon name="chevron-back" color={colors.ink} /></Pressable>
      </SafeAreaView>
    );
  }
  const title = locale === "en" ? tool.en : tool.zh;
  const blurb = locale === "en" ? tool.blurbEn : tool.blurbZh;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: 20 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
        <Pressable onPress={() => navigation.goBack()} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Icon name="chevron-back" color={colors.ink} />
        </Pressable>
        <Text style={{ color: colors.ink, fontFamily: "Palatino", fontSize: 22 }}>{title}</Text>
      </View>
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
        onPress={() => setShown(draft.trim() || title)}
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
    </SafeAreaView>
  );
}
