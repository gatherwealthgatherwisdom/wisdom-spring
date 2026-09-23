import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ConversationStatus } from "@spring/shared";
import type { AppStackParamList } from "../../navigation/RootNavigation";
import { spring } from "../../shared/lib/api";
import { copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";

type Props = NativeStackScreenProps<AppStackParamList, "Inbox">;

export function InboxScreen({ navigation }: Props) {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const [q, setQ] = useState("");
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: ["conversations", q], queryFn: () => spring.conversations(q ? { q } : undefined) });
  const notes = useQuery({ queryKey: ["announcements"], queryFn: () => spring.announcements() });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: 16 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 32, color: colors.ink }}>智泉</Text>
        <Pressable onPress={() => navigation.navigate("Settings")}><Text style={{ color: colors.violet }}>{text.settings}</Text></Pressable>
      </View>
      {(notes.data?.items ?? []).slice(0, 1).map((item) => (
        <Text key={item.id} style={{ color: colors.ink, backgroundColor: colors.card, borderRadius: 12, padding: 10, marginVertical: 8 }}>
          {locale === "en" ? item.bodyEn : item.bodyZh}
        </Text>
      ))}
      <TextInput value={q} onChangeText={setQ} placeholder={text.search} placeholderTextColor={colors.muted} style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 10, color: colors.ink, marginBottom: 8 }} />
      <Pressable onPress={() => navigation.navigate("Chat", {})} style={{ backgroundColor: colors.violet, borderRadius: 14, padding: 12, marginBottom: 12 }}>
        <Text style={{ color: "#F6F1E8", textAlign: "center" }}>{text.newChat}</Text>
      </Pressable>
      <FlatList
        data={list.data?.items ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate("Chat", { conversationId: item.id })} style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.line }}>
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
