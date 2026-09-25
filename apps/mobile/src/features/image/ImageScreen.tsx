import { IMAGE_STYLES } from "@spring/shared";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DRAW_CARDS } from "../discover/catalog";
import { openChat, type MainTabParamList } from "../../navigation/MainTabs";
import { spring } from "../../shared/lib/api";
import { copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";
import { Icon } from "../../shared/ui/Icon";
import { RecentRow } from "../../shared/ui/RecentRow";

function styleNote(id: string, locale: "zh-HK" | "en") {
  const notes: Record<string, { "zh-HK": string; en: string }> = {
    ink: { "zh-HK": "留白、淡墨", en: "Blank paper and light ink" },
    paper: { "zh-HK": "暖色紙本插畫", en: "Warm illustration on paper" },
    night: { "zh-HK": "夜色裡一點暖光", en: "A night scene with one warm light" },
  };
  return notes[id]?.[locale] ?? "";
}

function styleTone(id: string): string {
  if (id === "night") return "#1C1B19";
  if (id === "paper") return "#C4B39A";
  return "#3E5346";
}

type Props = BottomTabScreenProps<MainTabParamList, "Image">;

export function ImageScreen({ navigation }: Props) {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const [styleId, setStyleId] = useState(IMAGE_STYLES[0]?.id ?? "ink");
  const [prompt, setPrompt] = useState("");
  const signedIn = usePrefs((state) => Boolean(state.accessToken));
  const caps = useQuery({ queryKey: ["capabilities"], queryFn: () => spring.capabilities(), enabled: signedIn });
  const chats = useQuery({ queryKey: ["conversations", ""], queryFn: () => spring.conversations(), enabled: signedIn });
  const recent = (chats.data?.items ?? []).filter((item) => item.mode === "image").slice(0, 5);
  const scroll = useRef<ScrollView>(null);
  const blocked = caps.data?.image === false;

  function send(seed?: string, style?: string) {
    const content = (seed ?? prompt).trim();
    if (!content || blocked) return;
    openChat(navigation, { mode: "image", imageStyle: style ?? styleId, seed: content });
    setPrompt("");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 8 }}>
        <Text style={{ color: colors.ink, fontFamily: "Palatino", fontSize: 34 }}>{text.image}</Text>
        <Pressable accessibilityLabel={text.recentImage} onPress={() => scroll.current?.scrollToEnd({ animated: true })} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Icon name="time-outline" color={colors.ink} />
        </Pressable>
      </View>
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 24 }}>
        {caps.data && !caps.data.image ? (
          <Text style={{ color: colors.ink, backgroundColor: colors.card, borderRadius: 12, padding: 12, marginBottom: 12 }}>{text.noImageModel}</Text>
        ) : null}
        <Pressable onPress={() => send(text.drawHero, "ink")} style={{ backgroundColor: colors.ink, borderRadius: 16, minHeight: 140, padding: 16, marginBottom: 14, justifyContent: "space-between" }}>
          <Text style={{ color: colors.bg, fontSize: 20 }}>{text.drawHero}</Text>
          <View style={{ alignSelf: "flex-start", backgroundColor: colors.card, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}>
            <Text style={{ color: colors.ink }}>{text.start}</Text>
          </View>
        </Pressable>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
          <UseCard title={text.imageCreate} tone="#2F4A3C" onPress={() => { setStyleId("ink"); setPrompt(text.imageCreate); }} />
          {DRAW_CARDS.map((card) => (
            <UseCard
              key={card.id}
              title={locale === "en" ? card.en : card.zh}
              tone={card.tone}
              onPress={() => {
                const next = card.id === "portrait" ? "paper" : "ink";
                setStyleId(next);
                setPrompt(locale === "en" ? card.en : card.zh);
              }}
            />
          ))}
        </View>
        <Text style={{ color: colors.ink, fontSize: 18, marginBottom: 10 }}>{text.styles}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 8 }}>
          {IMAGE_STYLES.map((style) => (
            <Pressable
              key={style.id}
              onPress={() => setStyleId(style.id)}
              style={{ width: 140, minHeight: 120, borderRadius: 16, borderWidth: styleId === style.id ? 2 : 1, borderColor: styleId === style.id ? colors.accent : colors.line, backgroundColor: styleTone(style.id), padding: 12, justifyContent: "flex-end" }}
            >
              <Text style={{ color: "#F7F6F3" }}>{locale === "en" ? style.en : style.zh}</Text>
              <Text style={{ color: "#F7F6F3CC", fontSize: 12, marginTop: 4 }}>{styleNote(style.id, locale)}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={{ color: colors.muted, marginTop: 16, marginBottom: 8 }}>{text.recentImage}</Text>
        {recent.length === 0 ? (
          <RecentRow modeLabel={text.image} locale={locale} empty={text.emptyImage} />
        ) : (
          recent.map((item) => (
            <RecentRow key={item.id} item={item} modeLabel={text.image} locale={locale} onPress={() => openChat(navigation, { conversationId: item.id, mode: "image" })} />
          ))
        )}
      </ScrollView>
      <View style={{ flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 28, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card }}>
        <Pressable style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center" }}>
          <Icon name="add" color={colors.ink} />
        </Pressable>
        <TextInput
          value={prompt}
          onChangeText={setPrompt}
          placeholder={text.placeholder}
          placeholderTextColor={colors.muted}
          style={{ flex: 1, minHeight: 36, color: colors.ink, fontSize: 16 }}
        />
        <Pressable
          accessibilityLabel={text.start}
          onPress={() => send()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", opacity: blocked ? 0.4 : 1 }}
        >
          <Icon name="arrow-up" color={colors.onAccent} size={18} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function UseCard({ title, tone, onPress }: { title: string; tone: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ width: "47%", minHeight: 150, backgroundColor: tone, borderRadius: 16, padding: 12, justifyContent: "flex-end", overflow: "hidden" }}>
      <View style={{ position: "absolute", top: 16, left: 14, width: 56, height: 70, borderRadius: 8, backgroundColor: "#FFFFFF22" }} />
      <View style={{ position: "absolute", top: 28, left: 32, width: 56, height: 70, borderRadius: 8, backgroundColor: "#FFFFFF33" }} />
      <View style={{ alignSelf: "flex-end", backgroundColor: "#1F6B4A", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 8 }}>
        <Text style={{ color: "#F7F6F3", fontSize: 11 }}>New</Text>
      </View>
      <Text style={{ color: "#F7F6F3" }}>{title}</Text>
    </Pressable>
  );
}
