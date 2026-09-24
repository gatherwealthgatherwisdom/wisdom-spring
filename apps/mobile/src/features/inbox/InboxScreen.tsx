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

function cardStyle(colors: { card: string; line: string }) {
  return { backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 };
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
      <Text style={{ fontSize: 32, color: colors.ink, fontFamily: "Palatino" }}>智泉</Text>
      <View style={{ height: 2, width: 48, backgroundColor: colors.gold, marginVertical: 10 }} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <Pressable onPress={() => openChat(navigation, { mode: "write", templateId: "email" })} style={cardStyle(colors)}><Text style={{ color: colors.ink }}>{text.cards.email}</Text></Pressable>
        <Pressable onPress={() => navigation.navigate("Translate")} style={cardStyle(colors)}><Text style={{ color: colors.ink }}>{text.cards.translate}</Text></Pressable>
        <Pressable onPress={() => navigation.navigate("Image")} style={cardStyle(colors)}><Text style={{ color: colors.ink }}>{text.cards.image}</Text></Pressable>
      </View>
      {(notes.data?.items ?? []).slice(0, 1).map((item) => (
        <Text key={item.id} style={{ color: colors.ink, backgroundColor: colors.card, borderRadius: 12, padding: 10, marginVertical: 8 }}>
          {locale === "en" ? item.bodyEn : item.bodyZh}
        </Text>
      ))}
      <TextInput value={q} onChangeText={setQ} placeholder={text.search} placeholderTextColor={colors.muted} style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 10, color: colors.ink, marginBottom: 8 }} />
      <Pressable onPress={() => openChat(navigation, { mode: "chat" })} style={{ backgroundColor: colors.ink, borderRadius: 14, padding: 12, marginBottom: 12 }}>
        <Text style={{ color: colors.bg, textAlign: "center" }}>{text.newChat}</Text>
      </Pressable>
      <FlatList
        data={list.data?.items ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => openChat(navigation, { conversationId: item.id, mode: item.mode })} style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.line }}>
            <Text style={{ color: colors.ink, fontSize: 16 }}>{item.title || text.newChat}</Text>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 6 }}>
              <Pressable onPress={() => void spring.updateConversation(item.id, { pinned: !item.pinnedAt }).then(() => queryClient.invalidateQueries({ queryKey: ["conversations"] }))}>
                <Text style={{ color: colors.gold }}>{text.pin}</Text>
              </Pressable>
              <Pressable onPress={() => void spring.updateConversation(item.id, { status: ConversationStatus.ARCHIVED }).then(() => queryClient.invalidateQueries({ queryKey: ["conversations"] }))}>
                <Text style={{ color: colors.muted }}>{text.archive}</Text>
              </Pressable>
              <Pressable onPress={() => void spring.deleteConversation(item.id).then(() => queryClient.invalidateQueries({ queryKey: ["conversations"] }))}>
                <Text style={{ color: colors.danger }}>{text.remove}</Text>
              </Pressable>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
