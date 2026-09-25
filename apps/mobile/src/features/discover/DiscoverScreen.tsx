import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useState } from "react";
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { AppStackParamList, MainTabParamList } from "../../navigation/MainTabs";
import { copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";
import { Icon } from "../../shared/ui/Icon";
import { HEROES, RECOS, TOOLS, type CardItem } from "./catalog";

type Props = BottomTabScreenProps<MainTabParamList, "Discover">;
const SCREEN_W = Dimensions.get("window").width;
const HERO_W = SCREEN_W * 0.62;
const PAGE_W = SCREEN_W - 72;

export function DiscoverScreen({ navigation }: Props) {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const stack = navigation.getParent<NativeStackNavigationProp<AppStackParamList>>();
  const [page, setPage] = useState(0);
  const pages = [0, 1, 2];
  const featured = RECOS.slice(0, 2);
  const rest = RECOS.slice(2);

  function onToolsScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    setPage(Math.round(event.nativeEvent.contentOffset.x / PAGE_W));
  }

  function openTool(id: string) {
    stack?.navigate("Tool", { id });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <Text style={{ color: colors.ink, fontFamily: "Palatino", fontSize: 34, marginHorizontal: 20, marginBottom: 16 }}>{text.discover}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10, marginBottom: 18 }}>
          {HEROES.map((hero) => (
            <Pressable key={hero.id} onPress={() => stack?.navigate("AllTools")} style={{ width: HERO_W, height: 150, backgroundColor: hero.tone, borderRadius: 16, overflow: "hidden" }}>
              <View style={{ flex: 1, padding: 12, flexDirection: "row", justifyContent: "flex-end" }}>
                <View style={{ width: 46, height: 30, borderRadius: 6, backgroundColor: "#FFFFFF22", marginRight: 8, marginTop: 8 }} />
                <View style={{ width: 28, height: 48, borderRadius: 6, backgroundColor: "#FFFFFF33", marginTop: 4 }} />
              </View>
              <View style={{ padding: 14 }}>
                <Text style={{ color: "#F7F6F3", fontSize: 16 }} numberOfLines={2}>{locale === "en" ? hero.en : hero.zh}</Text>
                <Text style={{ color: "#F7F6F3", marginTop: 4 }}>{text.viewAll}</Text>
              </View>
            </Pressable>
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
                {TOOLS.filter((tool) => tool.page === index).map((tool) => (
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
    </SafeAreaView>
  );
}

function RecoCard({ card, locale, tall, onPress }: { card: CardItem; locale: "zh-HK" | "en"; tall?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ width: "47%", minHeight: tall ? 188 : 148, backgroundColor: card.tone, borderRadius: 16, overflow: "hidden" }}>
      <View style={{ height: tall ? 72 : 48, padding: 12, flexDirection: "row", justifyContent: "flex-end" }}>
        <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: "#FFFFFF22" }} />
        <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: "#FFFFFF33", marginLeft: -10, marginTop: 12 }} />
      </View>
      <View style={{ padding: 14, paddingTop: 0 }}>
        <Text style={{ color: "#F7F6F3", fontSize: 16 }}>{locale === "en" ? card.en : card.zh}</Text>
        <Text style={{ color: "#F7F6F3CC", marginTop: 6, fontSize: 12 }}>{locale === "en" ? card.blurbEn : card.blurbZh}</Text>
      </View>
    </Pressable>
  );
}
