import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../../navigation/RootNavigation";
import { copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";
import { Icon } from "../../shared/ui/Icon";
import { TOOLS } from "./catalog";

type Props = NativeStackScreenProps<AppStackParamList, "AllTools">;

export function AllToolsScreen({ navigation }: Props) {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: 8 }}>
        <Pressable onPress={() => navigation.goBack()} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Icon name="chevron-back" color={colors.ink} />
        </Pressable>
        <Text style={{ color: colors.ink, fontFamily: "Palatino", fontSize: 22 }}>{text.tools}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
        {TOOLS.map((tool) => (
          <Pressable key={tool.id} onPress={() => navigation.navigate("Tool", { id: tool.id })} style={{ width: "21%", alignItems: "center", gap: 8 }}>
            <Icon name={tool.icon} color={colors.accent} size={26} />
            <Text style={{ color: colors.ink, fontSize: 12, textAlign: "center" }}>{locale === "en" ? tool.en : tool.zh}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
