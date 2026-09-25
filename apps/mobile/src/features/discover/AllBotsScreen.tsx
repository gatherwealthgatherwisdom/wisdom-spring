import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../../navigation/RootNavigation";
import { copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";
import { Icon } from "../../shared/ui/Icon";
import { BOTS } from "./catalog";

type Props = NativeStackScreenProps<AppStackParamList, "AllBots">;

export function AllBotsScreen({ navigation }: Props) {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 8 }}>
        <Pressable onPress={() => navigation.goBack()} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Icon name="chevron-back" color={colors.ink} />
        </Pressable>
        <Text style={{ color: colors.ink, fontFamily: "Palatino", fontSize: 22 }}>{text.bots}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {BOTS.map((bot) => (
          <Pressable key={bot.id} onPress={() => navigation.navigate("Tool", { id: "bot" })} style={{ flexDirection: "row", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: bot.tone, alignItems: "center", justifyContent: "center" }}>
              <Icon name="globe-outline" color="#F7F6F3" size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.ink, fontSize: 16 }}>{locale === "en" ? bot.en : bot.zh}</Text>
              <Text style={{ color: colors.muted, marginTop: 4 }} numberOfLines={2}>{locale === "en" ? bot.blurbEn : bot.blurbZh}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
