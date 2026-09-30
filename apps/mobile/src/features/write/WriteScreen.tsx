import { WRITE_TEMPLATES } from "@spring/shared";
import type { NavigationProp } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Screen } from "../../shared/ui/Screen";
import { openChat, type MainTabParamList } from "../../navigation/MainTabs";
import { spring } from "../../shared/lib/api";
import { copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";
import { Icon, type IconName } from "../../shared/ui/Icon";
import { RecentRow } from "../../shared/ui/RecentRow";
import { ScreenHeader } from "../../shared/ui/ScreenHeader";

const TEMPLATE_ICON: Record<string, IconName> = {
  email: "mail-outline",
  report: "list-outline",
  rewrite: "refresh-outline",
  formal: "document-text-outline",
  plain: "chatbox-outline",
  cantonese: "chatbubbles-outline",
};

const FEATURED = ["email", "rewrite", "cantonese"];

export function WriteScreen({ navigation }: { navigation: NavigationProp<MainTabParamList> }) {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const signedIn = usePrefs((state) => Boolean(state.accessToken));
  const chats = useQuery({ queryKey: ["conversations", ""], queryFn: () => spring.conversations(), enabled: signedIn });
  const catalog = useQuery({ queryKey: ["catalog-write"], queryFn: () => spring.catalogWrite() });
  const templates = catalog.data?.items ?? WRITE_TEMPLATES;
  const recent = (chats.data?.items ?? []).filter((item) => item.mode === "write").slice(0, 5);
  const featured = templates.filter((item) => FEATURED.includes(item.id));
  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
      <ScreenHeader title={text.write} />
      <Text style={{ color: colors.muted, marginBottom: 10 }}>{text.popular}</Text>
      {featured.map((template) => (
        <Pressable
          key={`f-${template.id}`}
          onPress={() => openChat(navigation, { mode: "write", templateId: template.id })}
          style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 8 }}
        >
          <Icon name={TEMPLATE_ICON[template.id] ?? "create-outline"} color={colors.accent} size={22} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.ink, fontSize: 16 }}>{locale === "en" ? template.en : template.zh}</Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>{locale === "en" ? template.blurbEn : template.blurbZh}</Text>
          </View>
        </Pressable>
      ))}
      <Text style={{ color: colors.muted, marginTop: 8, marginBottom: 10 }}>{text.all}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {templates.map((template) => (
          <Pressable
            key={template.id}
            onPress={() => openChat(navigation, { mode: "write", templateId: template.id })}
            style={{ width: "47%", backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: 16, padding: 14, gap: 6 }}
          >
            <Icon name={TEMPLATE_ICON[template.id] ?? "create-outline"} color={colors.accent} size={20} />
            <Text style={{ color: colors.ink, fontSize: 16 }}>{locale === "en" ? template.en : template.zh}</Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>{locale === "en" ? template.blurbEn : template.blurbZh}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ color: colors.muted, marginTop: 16, marginBottom: 8 }}>{text.recentWrite}</Text>
      {recent.length === 0 ? <RecentRow modeLabel={text.write} locale={locale} empty={text.emptyWrite} /> : recent.map((item) => (
        <RecentRow key={item.id} item={item} modeLabel={text.write} locale={locale} onPress={() => openChat(navigation, { conversationId: item.id, mode: "write" })} />
      ))}
      </ScrollView>
    </Screen>
  );
}
