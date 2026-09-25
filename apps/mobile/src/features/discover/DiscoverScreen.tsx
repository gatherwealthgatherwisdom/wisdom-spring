import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useState } from "react";
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { AppStackParamList, MainTabParamList } from "../../navigation/MainTabs";
import { copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";
import { Icon } from "../../shared/ui/Icon";
import { HEROES, RECOS, TOOLS } from "./catalog";

type Props = BottomTabScreenProps<MainTabParamList, "Discover">;
const PAGE_W = Dimensions.get("window").width - 40;

export function DiscoverScreen({ navigation }: Props) {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const stack = navigation.getParent<NativeStackNavigationProp<AppStackParamList>>();
  const [page, setPage] = useState(0);
  const pages = [0, 1, 2];
  function onToolsScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(event.nativeEvent.contentOffset.x / PAGE_W);
    setPage(next);
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
        <Text style={{ color: colors.ink, fontFamily: "Palatino", fontSize: 34, marginBottom: 16 }}>{text.discover}</Text>
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ marginBottom: 18 }}>
          {HEROES.map((hero) => (
            <Pressable key={hero.id} onPress={() => stack?.navigate("AllTools")} style={{ width: PAGE_W / 2 + 8, minHeight: 120, marginRight: 10, backgroundColor: hero.tone, borderRadius: 16, padding: 14, justifyContent: "flex-end" }}>
              <Text style={{ color: "#F7F6F3", fontSize: 16 }}>{locale === "en" ? hero.en : hero.zh}</Text>
              <Text style={{ color: "#F7F6F3", marginTop: 6 }}>{text.viewAll}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 18 }}>
          <Text style={{ color: colors.ink, fontSize: 18, marginBottom: 14 }}>{text.tools}</Text>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onToolsScroll}>
            {pages.map((index) => (
              <View key={index} style={{ width: PAGE_W - 8, flexDirection: "row", flexWrap: "wrap" }}>
                {TOOLS.filter((tool) => tool.page === index).map((tool) => (
                  <Pressable key={tool.id} onPress={() => stack?.navigate("Tool", { id: tool.id })} style={{ width: "25%", alignItems: "center", marginBottom: 16, gap: 6 }}>
                    <Icon name={tool.icon} color={colors.accent} size={24} />
                    <Text style={{ color: colors.ink, fontSize: 11, textAlign: "center" }}>{locale === "en" ? tool.en : tool.zh}</Text>
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
        <Text style={{ color: colors.ink, fontSize: 18, marginBottom: 12 }}>{text.recommended}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {RECOS.map((card) => (
            <Pressable key={card.id} onPress={() => stack?.navigate("Tool", { id: "rewrite" })} style={{ width: "47%", minHeight: 140, backgroundColor: card.tone, borderRadius: 16, padding: 14, justifyContent: "space-between" }}>
              <View>
                <Text style={{ color: "#F7F6F3", fontSize: 16 }}>{locale === "en" ? card.en : card.zh}</Text>
                <Text style={{ color: "#F7F6F3CC", marginTop: 6, fontSize: 12 }}>{locale === "en" ? card.blurbEn : card.blurbZh}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
