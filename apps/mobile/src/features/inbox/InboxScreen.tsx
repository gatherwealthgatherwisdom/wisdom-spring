import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ConversationStatus } from "@spring/shared";
import { openChat, type MainTabParamList } from "../../navigation/MainTabs";
import { spring } from "../../shared/lib/api";
import { copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";
import { Icon, type IconName } from "../../shared/ui/Icon";
import { ScreenHeader } from "../../shared/ui/ScreenHeader";

function modeLabel(mode: string | undefined, text: { inbox: string; write: string; translate: string; image: string }) {
  if (mode === "write") return text.write;
  if (mode === "translate") return text.translate;
  if (mode === "image") return text.image;
  return text.inbox;
}

function iconButton(colors: { line: string }) {
  return { width: 32, height: 32, alignItems: "center" as const, justifyContent: "center" as const, borderRadius: 16, borderWidth: 1, borderColor: colors.line };
}

function QuickCard({
  colors,
  icon,
  title,
  onPress,
}: {
  colors: { card: string; line: string; ink: string; accent: string };
  icon: IconName;
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: 14, padding: 14 }}>
      <Icon name={icon} color={colors.accent} size={20} />
      <Text style={{ color: colors.ink, fontSize: 16 }}>{title}</Text>
    </Pressable>
  );
}

type Props = BottomTabScreenProps<MainTabParamList, "Inbox">;

export function InboxScreen({ navigation }: Props) {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const [q, setQ] = useState("");
  const signedIn = usePrefs((state) => Boolean(state.accessToken));
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: ["conversations", q],
    queryFn: () => spring.conversations(q ? { q } : undefined),
    enabled: signedIn,
  });
  const notes = useQuery({ queryKey: ["announcements"], queryFn: () => spring.announcements() });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: 16 }}>
      <ScreenHeader title="智泉" />
      <Text style={{ color: colors.muted, marginTop: -8, marginBottom: 14 }}>{text.splash}</Text>
      <View style={{ gap: 8, marginBottom: 14 }}>
        <QuickCard colors={colors} icon="mail-outline" title={text.cards.email} onPress={() => openChat(navigation, { mode: "write", templateId: "email" })} />
        <QuickCard colors={colors} icon="language-outline" title={text.cards.translate} onPress={() => navigation.navigate("Translate")} />
        <QuickCard colors={colors} icon="image-outline" title={text.cards.image} onPress={() => navigation.navigate("Image")} />
      </View>
      {(notes.data?.items ?? []).slice(0, 1).map((item) => (
        <Text key={item.id} style={{ color: colors.ink, backgroundColor: colors.card, borderRadius: 12, padding: 10, marginBottom: 10 }}>
          {locale === "en" ? item.bodyEn : item.bodyZh}
        </Text>
      ))}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        <TextInput value={q} onChangeText={setQ} placeholder={text.search} placeholderTextColor={colors.muted} style={{ flex: 1, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, borderRadius: 12, padding: 12, color: colors.ink }} />
        <Pressable onPress={() => openChat(navigation, { mode: "chat" })} style={{ backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.onAccent }}>{text.newChat}</Text>
        </Pressable>
      </View>
      <FlatList
        data={list.data?.items ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => openChat(navigation, { conversationId: item.id, mode: item.mode })} style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 12, marginBottom: 8 }}>
            <Text style={{ color: colors.ink, fontSize: 16 }}>{item.title || text.newChat}</Text>
            <Text style={{ color: colors.muted, marginTop: 2 }}>{modeLabel(item.mode, text)}</Text>
            <View style={{ flexDirection: "row", gap: 4, marginTop: 8 }}>
              <Pressable accessibilityLabel={text.pin} onPress={() => void spring.updateConversation(item.id, { pinned: !item.pinnedAt }).then(() => queryClient.invalidateQueries({ queryKey: ["conversations"] }))} style={iconButton(colors)}>
                <Icon name={item.pinnedAt ? "pin" : "pin-outline"} color={colors.accent} size={18} />
              </Pressable>
              <Pressable accessibilityLabel={text.archive} onPress={() => void spring.updateConversation(item.id, { status: ConversationStatus.ARCHIVED }).then(() => queryClient.invalidateQueries({ queryKey: ["conversations"] }))} style={iconButton(colors)}>
                <Icon name="archive-outline" color={colors.muted} size={18} />
              </Pressable>
              <Pressable accessibilityLabel={text.remove} onPress={() => void spring.deleteConversation(item.id).then(() => queryClient.invalidateQueries({ queryKey: ["conversations"] }))} style={iconButton(colors)}>
                <Icon name="trash-outline" color={colors.danger} size={18} />
              </Pressable>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
