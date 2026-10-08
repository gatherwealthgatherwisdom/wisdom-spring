import { useQuery } from "@tanstack/react-query";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../../navigation/RootNavigation";
import { spring } from "../../shared/lib/api";
import { copy } from "../../shared/lib/i18n";
import { usePrefs } from "../../shared/lib/prefs";
import { useColors } from "../../shared/theme";
import { Icon } from "../../shared/ui/Icon";
import { Screen } from "../../shared/ui/Screen";
import { ScreenHeader } from "../../shared/ui/ScreenHeader";
import { openCatalogTool } from "../../navigation/MainTabs";
import { toolsFromCatalog } from "./catalog";

type Props = NativeStackScreenProps<AppStackParamList, "AllTools">;

export function AllToolsScreen({ navigation }: Props) {
  const colors = useColors();
  const locale = usePrefs((state) => state.locale);
  const text = copy[locale];
  const catalog = useQuery({ queryKey: ["catalog-tools"], queryFn: () => spring.catalogTools() });
  const tools = toolsFromCatalog(catalog.data?.items);
  return (
    <Screen>
      <ScreenHeader title={text.tools} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 20, flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
        {tools.map((tool) => (
          <Pressable key={tool.id} onPress={() => openCatalogTool(navigation, tool.id)} style={{ width: "21%", alignItems: "center", gap: 8 }}>
            <Icon name={tool.icon} color={colors.accent} size={26} />
            <Text style={{ color: colors.ink, fontSize: 12, textAlign: "center" }}>{locale === "en" ? tool.en : tool.zh}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}
