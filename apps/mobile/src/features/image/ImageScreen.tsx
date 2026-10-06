import { IMAGE_STYLES } from "@spring/shared";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { KeyboardDock } from "../../shared/ui/KeyboardDock";
import { Screen } from "../../shared/ui/Screen";
import { cardsFromDiscover, HERO_ART, STYLE_ART } from "../discover/catalog";
import { openChat, type MainTabParamList } from "../../navigation/MainTabs";
import { mediaUrl, spring } from "../../shared/lib/api";
import { useHistory } from "../../shared/lib/history";
import { copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";
import { Cover } from "../../shared/ui/Cover";
import { Icon } from "../../shared/ui/Icon";
import { RecentRow } from "../../shared/ui/RecentRow";
import { Composer } from "../chat/Composer";
import { placeholderFor, type ComposerAction } from "../chat/composer-action";

type Props = BottomTabScreenProps<MainTabParamList, "Image">;

export function ImageScreen({ navigation }: Props) {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const [styleId, setStyleId] = useState(IMAGE_STYLES[0]?.id ?? "ink");
  const [prompt, setPrompt] = useState("");
  const [action, setAction] = useState<ComposerAction>("draw");
  const [hint, setHint] = useState<string | null>(null);
  const signedIn = usePrefs((state) => Boolean(state.accessToken));
  const caps = useQuery({ queryKey: ["capabilities"], queryFn: () => spring.capabilities(), enabled: signedIn });
  const chats = useHistory({ mode: "image" });
  const catalog = useQuery({ queryKey: ["catalog-styles"], queryFn: () => spring.catalogStyles() });
  const discover = useQuery({ queryKey: ["catalog-discover"], queryFn: () => spring.catalogDiscover() });
  const styles = catalog.data?.items ?? IMAGE_STYLES;
  const draws = cardsFromDiscover(discover.data?.items, "draw");
  const selected = useMemo(
    () => (styles.some((style) => style.id === styleId) ? styleId : (styles[0]?.id ?? "ink")),
    [styles, styleId],
  );
  const recent = chats.items.slice(0, 8);
  const scroll = useRef<ScrollView>(null);
  const blocked = caps.data?.image === false;

  function send(seed?: string, style?: string) {
    const content = (seed ?? prompt).trim();
    if (!content) return;
    if (style || action === "draw") {
      if (blocked) return;
      openChat(navigation, { mode: "image", imageStyle: style ?? selected, seed: content });
      setPrompt("");
      setHint(null);
      return;
    }
    if (action === "look") {
      setHint(text.needPhoto);
      return;
    }
    if (action === "file") {
      setHint(text.needFile);
      return;
    }
    openChat(navigation, { mode: "chat", seed: content });
    setPrompt("");
    setHint(null);
  }

  return (
    <Screen edges={["top"]}>
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
        <Cover source={HERO_ART.drawHero} style={{ borderRadius: 16, minHeight: 140, marginBottom: 14 }} dim={0.4}>
          <Pressable onPress={() => send(text.drawHero, "ink")} style={{ minHeight: 140, padding: 16, justifyContent: "space-between" }}>
            <Text style={{ color: colors.bg, fontSize: 20 }}>{text.drawHero}</Text>
            <View style={{ alignSelf: "flex-start", backgroundColor: colors.card, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}>
              <Text style={{ color: colors.ink }}>{text.start}</Text>
            </View>
          </Pressable>
        </Cover>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
          <UseCard title={text.imageCreate} art={HERO_ART.drawCreate} onPress={() => { setStyleId("ink"); setPrompt(text.imageCreate); }} />
          {draws.map((card) => (
            <UseCard
              key={card.id}
              title={locale === "en" ? card.en : card.zh}
              art={card.art}
              onPress={() => {
                setStyleId(card.imageStyle ?? "ink");
                setPrompt(locale === "en" ? card.en : card.zh);
              }}
            />
          ))}
        </View>
        <Text style={{ color: colors.ink, fontSize: 18, marginBottom: 10 }}>{text.styles}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 8 }}>
          {styles.map((style) => (
            <Pressable
              key={style.id}
              onPress={() => setStyleId(style.id)}
              style={{ width: 140, minHeight: 120, borderRadius: 16, overflow: "hidden", borderWidth: selected === style.id ? 2 : 1, borderColor: selected === style.id ? colors.accent : colors.line }}
            >
              <Cover source={STYLE_ART[style.id] ?? HERO_ART.drawHero} style={{ flex: 1, minHeight: 116 }} dim={0.35}>
                <View style={{ flex: 1, minHeight: 116, padding: 12, justifyContent: "flex-end" }}>
                  <Text style={{ color: "#F7F6F3" }}>{locale === "en" ? style.en : style.zh}</Text>
                  <Text style={{ color: "#F7F6F3CC", fontSize: 12, marginTop: 4 }}>{locale === "en" ? style.blurbEn : style.blurbZh}</Text>
                </View>
              </Cover>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={{ color: colors.muted, marginTop: 16, marginBottom: 8 }}>{text.recentImage}</Text>
        {recent.length === 0 ? (
          <RecentRow modeLabel={text.image} locale={locale} empty={text.emptyImage} />
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {recent.map((item) => {
              const uri = mediaUrl(item.lastImageUrl);
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${text.recentImage} ${item.title || text.image}`}
                  onPress={() => openChat(navigation, { conversationId: item.id, mode: "image" })}
                  style={{ width: "47%", aspectRatio: 1, borderRadius: 16, overflow: "hidden", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line }}
                >
                  {uri ? (
                    <Image source={{ uri }} style={{ width: "100%", height: "100%" }} />
                  ) : (
                    <Cover source={HERO_ART.drawHero} style={{ width: "100%", height: "100%" }} dim={0.45} />
                  )}
                  <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 8, backgroundColor: "#1C1B1999" }}>
                    <Text style={{ color: "#F7F6F3", fontSize: 12 }} numberOfLines={1}>{item.title || text.image}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
      <KeyboardDock tabBar>
      <View style={{ marginHorizontal: 16, marginBottom: 6, gap: 8 }}>
        {hint ? <Text style={{ color: colors.ink }}>{hint}</Text> : null}
        <Composer
          value={prompt}
          placeholder={placeholderFor(text, action)}
          action={action}
          streaming={false}
          stopLabel={text.stop}
          onChange={setPrompt}
          onSend={() => send()}
          onStop={() => undefined}
          onAction={(next) => {
            setAction(next);
            setHint(null);
          }}
          onAttach={(kind) => {
            setHint(null);
            openChat(navigation, { mode: "chat", attach: kind });
          }}
        />
      </View>
      </KeyboardDock>
    </Screen>
  );
}

function UseCard({ title, art, onPress }: { title: string; art: import("react-native").ImageSourcePropType; onPress: () => void }) {
  return (
    <Cover source={art} style={{ width: "47%", minHeight: 150, borderRadius: 16 }} dim={0.3}>
      <Pressable onPress={onPress} style={{ minHeight: 150, padding: 12, justifyContent: "flex-end" }}>
        <View style={{ alignSelf: "flex-end", backgroundColor: "#1F6B4A", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 8 }}>
          <Text style={{ color: "#F7F6F3", fontSize: 11 }}>New</Text>
        </View>
        <Text style={{ color: "#F7F6F3" }}>{title}</Text>
      </Pressable>
    </Cover>
  );
}
