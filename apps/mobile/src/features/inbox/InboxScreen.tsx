import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BOTS, DRAW_CARDS, TOOLS } from "../discover/catalog";
import { PoolSheet } from "../discover/PoolSheet";
import { openChat, type MainTabParamList } from "../../navigation/MainTabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../../navigation/RootNavigation";
import { spring } from "../../shared/lib/api";
import { copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";
import { Icon } from "../../shared/ui/Icon";

type Props = BottomTabScreenProps<MainTabParamList, "Inbox">;

export function InboxScreen({ navigation }: Props) {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const signedIn = usePrefs((state) => Boolean(state.accessToken));
  const stack = navigation.getParent<NativeStackNavigationProp<AppStackParamList>>();
  const chats = useQuery({ queryKey: ["conversations", ""], queryFn: () => spring.conversations(), enabled: signedIn });
  const last = chats.data?.items[0];
  const [poolOpen, setPoolOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [attachOpen, setAttachOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const homeTools = TOOLS.filter((tool) => tool.page === 0).slice(0, 4);

  function sendHome() {
    const seed = draft.trim();
    setDraft("");
    openChat(navigation, seed ? { mode: "chat", seed } : { mode: "chat" });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingTop: 4 }}>
        <Pressable onPress={() => navigation.navigate("Discover")} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Icon name="menu-outline" color={colors.ink} size={26} />
        </Pressable>
        <Pressable onPress={() => navigation.navigate("Settings")} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" }}>
          <Icon name="person-outline" color={colors.ink} size={18} />
        </Pressable>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <Pressable onPress={() => navigation.navigate("Discover")} style={{ backgroundColor: colors.ink, borderRadius: 16, padding: 16, minHeight: 140, marginBottom: 14, flexDirection: "row", overflow: "hidden" }}>
          <View style={{ flex: 1, justifyContent: "space-between" }}>
            <Text style={{ color: colors.bg, fontSize: 18, lineHeight: 26 }}>{locale === "en" ? "Use Wisdom Spring on every device" : "在所有設備上使用智泉"}</Text>
            <View style={{ alignSelf: "flex-start", backgroundColor: colors.card, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginTop: 12 }}>
              <Text style={{ color: colors.ink }}>{text.explore}</Text>
            </View>
          </View>
          <View style={{ width: 108, justifyContent: "center", alignItems: "flex-end" }}>
            <View style={{ width: 54, height: 36, borderRadius: 6, backgroundColor: "#3A3A38", marginBottom: -8, marginRight: 18 }} />
            <View style={{ width: 72, height: 46, borderRadius: 8, backgroundColor: "#5A5956", marginBottom: -10, zIndex: 1 }} />
            <View style={{ width: 28, height: 48, borderRadius: 6, backgroundColor: "#2A2A28", position: "absolute", right: 4, bottom: 8 }} />
          </View>
        </Pressable>
        <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 14 }}>
            <Text style={{ color: colors.ink, fontSize: 18 }}>{text.tools}</Text>
            <Pressable onPress={() => stack?.navigate("AllTools")}><Text style={{ color: colors.muted }}>{text.viewAll}</Text></Pressable>
          </View>
          <View style={{ flexDirection: "row" }}>
            {homeTools.map((tool) => (
              <Pressable key={tool.id} onPress={() => stack?.navigate("Tool", { id: tool.id })} style={{ flex: 1, alignItems: "center", gap: 8 }}>
                <Icon name={tool.icon} color={colors.accent} size={26} />
                <Text style={{ color: colors.ink, fontSize: 12, textAlign: "center" }}>{locale === "en" ? tool.en : tool.zh}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
            <Text style={{ color: colors.ink, fontSize: 18 }}>{text.image}</Text>
            <Pressable onPress={() => navigation.navigate("Image")}><Text style={{ color: colors.muted }}>{text.viewAll}</Text></Pressable>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {DRAW_CARDS.map((card) => (
              <Pressable key={card.id} onPress={() => openChat(navigation, { mode: "image", imageStyle: card.id === "portrait" ? "paper" : "ink" })} style={{ flex: 1, minHeight: 158, backgroundColor: card.tone, borderRadius: 16, padding: 12, justifyContent: "flex-end", overflow: "hidden" }}>
                <View style={{ position: "absolute", top: 16, left: 16, width: 64, height: 80, borderRadius: 8, backgroundColor: "#FFFFFF22" }} />
                <View style={{ position: "absolute", top: 28, left: 36, width: 64, height: 80, borderRadius: 8, backgroundColor: "#FFFFFF33" }} />
                <View style={{ position: "absolute", top: 18, right: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: "#F7F6F3AA" }} />
                <View style={{ alignSelf: "flex-end", backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 8 }}>
                  <Text style={{ color: colors.onAccent, fontSize: 11 }}>New</Text>
                </View>
                <Text style={{ color: "#F7F6F3" }}>{locale === "en" ? card.en : card.zh}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={{ color: colors.ink, fontSize: 18 }}>{text.bots}</Text>
            <Pressable onPress={() => stack?.navigate("AllBots")}><Text style={{ color: colors.muted }}>{text.viewAll}</Text></Pressable>
          </View>
          {BOTS.map((bot) => (
            <Pressable key={bot.id} onPress={() => stack?.navigate("Tool", { id: "bot" })} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.line, alignItems: "center", justifyContent: "center" }}>
                <Icon name="globe-outline" color={colors.muted} size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.ink }}>{locale === "en" ? bot.en : bot.zh}</Text>
                <Text style={{ color: colors.muted, marginTop: 2 }} numberOfLines={2}>{locale === "en" ? bot.blurbEn : bot.blurbZh}</Text>
              </View>
              <Icon name="globe-outline" color={colors.line} size={22} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: 16, paddingBottom: 8, gap: 8 }}>
        {hint ? <Text style={{ color: colors.ink }}>{hint}</Text> : null}
        {attachOpen ? (
          <View style={{ flexDirection: "row", gap: 10 }}>
            {(["camera-outline", "image-outline", "document-text-outline"] as const).map((name) => (
              <Pressable
                key={name}
                onPress={() => setHint(text.attachLater)}
                style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" }}
              >
                <Icon name={name} color={colors.ink} size={18} />
              </Pressable>
            ))}
          </View>
        ) : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Pressable onPress={() => openChat(navigation, last ? { conversationId: last.id, mode: last.mode } : { mode: "chat" })} style={chip(colors)}>
            <Icon name="time-outline" color={colors.ink} size={16} />
            <Text style={{ color: colors.ink }}>{text.lastChat}</Text>
          </Pressable>
          <Pressable onPress={() => setPoolOpen(true)} style={chip(colors)}>
            <Text style={{ color: colors.ink }}>{text.app}</Text>
          </Pressable>
        </ScrollView>
        <View style={{ flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, borderRadius: 28, paddingHorizontal: 8, paddingVertical: 6 }}>
          <Pressable accessibilityLabel="+" onPress={() => { setAttachOpen((open) => !open); setHint(null); }} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
            <Icon name={attachOpen ? "close" : "add"} color={colors.ink} />
          </Pressable>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={text.message}
            placeholderTextColor={colors.muted}
            onSubmitEditing={sendHome}
            style={{ flex: 1, color: colors.ink, paddingVertical: 8 }}
          />
          <Pressable onPress={() => openChat(navigation, { mode: "chat" })} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
            <Icon name="mic-outline" color={colors.ink} />
          </Pressable>
          <Pressable onPress={() => openChat(navigation, { mode: "chat" })} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
            <Icon name="call-outline" color={colors.ink} />
          </Pressable>
        </View>
      </View>
      <PoolSheet open={poolOpen} onClose={() => setPoolOpen(false)} />
    </SafeAreaView>
  );
}

function chip(colors: { card: string; line: string }) {
  return {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  };
}
