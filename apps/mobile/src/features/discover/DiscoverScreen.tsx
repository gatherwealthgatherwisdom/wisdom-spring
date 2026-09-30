import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Text, View } from "react-native";
import { Screen } from "../../shared/ui/Screen";
import { paramsForLiveTool, type AppStackParamList, type MainTabParamList } from "../../navigation/MainTabs";
import { spring } from "../../shared/lib/api";
import { copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";
import { Cover } from "../../shared/ui/Cover";
import { Icon } from "../../shared/ui/Icon";
import { cardsFromDiscover, toolsFromCatalog, type CardItem } from "./catalog";

type Props = BottomTabScreenProps<MainTabParamList, "Discover">;
const SCREEN_W = Dimensions.get("window").width;
const HERO_W = SCREEN_W * 0.62;
const PAGE_W = SCREEN_W - 72;

export function DiscoverScreen({ navigation }: Props) {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const stack = navigation.getParent<NativeStackNavigationProp<AppStackParamList>>();
  const catalog = useQuery({ queryKey: ["catalog-tools"], queryFn: () => spring.catalogTools() });
  const discover = useQuery({ queryKey: ["catalog-discover"], queryFn: () => spring.catalogDiscover() });
  const tools = toolsFromCatalog(catalog.data?.items);
  const heroes = cardsFromDiscover(discover.data?.items, "hero");
  const recos = cardsFromDiscover(discover.data?.items, "reco");
  const [page, setPage] = useState(0);
  const pages = [...new Set(tools.map((tool) => tool.page))].sort((a, b) => a - b);
  const featured = recos.slice(0, 2);
  const rest = recos.slice(2);

  function onToolsScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    setPage(Math.round(event.nativeEvent.contentOffset.x / PAGE_W));
  }

  function openTool(id: string) {
    const tool = tools.find((item) => item.id === id);
    if (tool) {
      const params = paramsForLiveTool({ ...tool, live: true }, locale);
      if (params) {
        stack?.navigate("Chat", params);
        return;
      }
    }
    stack?.navigate("Tool", { id });
  }

  return (
    <Screen edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Text style={{ color: colors.ink, fontFamily: "Palatino", fontSize: 34, marginHorizontal: 20, marginBottom: 16 }}>{text.discover}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10, marginBottom: 18 }}>
          {heroes.map((hero) => (
            <Cover key={hero.id} source={hero.art} style={{ width: HERO_W, height: 150, borderRadius: 16 }} dim={0.4}>
              <Pressable
                onPress={() => {
                  if (hero.toolId) openTool(hero.toolId);
                  else stack?.navigate("AllTools");
                }}
                style={{ flex: 1, justifyContent: "flex-end", padding: 14 }}
              >
                <Text style={{ color: "#F7F6F3", fontSize: 16 }} numberOfLines={2}>{locale === "en" ? hero.en : hero.zh}</Text>
                <Text style={{ color: "#F7F6F3", marginTop: 4 }}>{text.viewAll}</Text>
              </Pressable>
            </Cover>
          ))}
        </ScrollView>
        <View style={{ marginHorizontal: 20, backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 18 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 14 }}>
            <Text style={{ color: colors.ink, fontSize: 18 }}>{text.tools}</Text>
            <Pressable onPress={() => stack?.navigate("AllTools")}><Text style={{ color: colors.muted }}>{text.viewAll}</Text></Pressable>
          </View>
          <ScrollView horizontal pagingEnabled decelerationRate="fast" showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onToolsScroll}>
            {pages.map((index) => (
              <View key={index} style={{ width: PAGE_W, flexDirection: "row", flexWrap: "wrap" }}>
                {tools.filter((tool) => tool.page === index).map((tool) => (
                  <Pressable key={tool.id} onPress={() => openTool(tool.id)} style={{ width: "25%", alignItems: "center", marginBottom: 18, gap: 8 }}>
                    <Icon name={tool.icon} color={colors.accent} size={28} />
                    <Text style={{ color: colors.ink, fontSize: 12, textAlign: "center" }}>{locale === "en" ? tool.en : tool.zh}</Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </ScrollView>
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 6 }}>
            {pages.map((index) => (
              <View key={index} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: page === index ? colors.accent : colors.line }} />
            ))}
          </View>
        </View>
        <Text style={{ color: colors.ink, fontSize: 18, marginHorizontal: 20, marginBottom: 12 }}>{text.recommended}</Text>
        <View style={{ paddingHorizontal: 20, flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {featured.map((card) => (
            <RecoCard key={card.id} card={card} locale={locale} tall onPress={() => openTool(card.toolId ?? "rewrite")} />
          ))}
          {rest.map((card) => (
            <RecoCard key={card.id} card={card} locale={locale} onPress={() => openTool(card.toolId ?? "rewrite")} />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

function RecoCard({ card, locale, tall, onPress }: { card: CardItem; locale: "zh-HK" | "en"; tall?: boolean; onPress: () => void }) {
  return (
    <Cover source={card.art} style={{ width: "47%", minHeight: tall ? 188 : 148, borderRadius: 16 }} dim={0.45}>
      <Pressable onPress={onPress} style={{ flex: 1, minHeight: tall ? 188 : 148, justifyContent: "flex-end", padding: 14 }}>
        <Text style={{ color: "#F7F6F3", fontSize: 16 }}>{locale === "en" ? card.en : card.zh}</Text>
        <Text style={{ color: "#F7F6F3CC", marginTop: 6, fontSize: 12 }}>{locale === "en" ? card.blurbEn : card.blurbZh}</Text>
      </Pressable>
    </Cover>
  );
}
