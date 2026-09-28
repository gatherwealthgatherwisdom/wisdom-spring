import { Pressable, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../../navigation/RootNavigation";
import { copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";
import { Cover } from "../../shared/ui/Cover";
import { Screen } from "../../shared/ui/Screen";
import { ScreenHeader } from "../../shared/ui/ScreenHeader";
import { BOTS } from "./catalog";

type Props = NativeStackScreenProps<AppStackParamList, "AllBots">;

export function AllBotsScreen({ navigation }: Props) {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  return (
    <Screen>
      <ScreenHeader title={text.bots} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {BOTS.map((bot) => (
          <Pressable
            key={bot.id}
            onPress={() =>
              navigation.navigate("Chat", {
                mode: "chat",
                templateId: bot.id,
                seed: locale === "en" ? bot.blurbEn : bot.blurbZh,
              })
            }
            style={{ flexDirection: "row", gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.line }}
          >
            <Cover source={bot.art} style={{ width: 52, height: 52, borderRadius: 26 }} dim={0} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.ink, fontSize: 16 }}>{locale === "en" ? bot.en : bot.zh}</Text>
              <Text style={{ color: colors.muted, marginTop: 4 }} numberOfLines={2}>{locale === "en" ? bot.blurbEn : bot.blurbZh}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}
